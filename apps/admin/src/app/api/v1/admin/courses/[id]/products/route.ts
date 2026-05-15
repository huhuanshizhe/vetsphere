import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type RelationshipType = 'required' | 'recommended' | 'mentioned';
type RelationType = 'course' | 'module' | 'instructor';

function extractAccessToken(req: NextRequest): string | undefined {
  const authorization = req.headers.get('authorization')?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }

  const token = authorization.slice(7).trim();
  return token || undefined;
}

function normalizeRelationshipType(value: unknown): RelationshipType {
  if (value === 'required' || value === 'recommended' || value === 'mentioned') {
    return value;
  }

  return 'recommended';
}

function normalizeRelationType(value: unknown): RelationType {
  if (value === 'course' || value === 'module' || value === 'instructor') {
    return value;
  }

  return 'course';
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function normalizeDayIndex(value: unknown, relationType: RelationType): number | null {
  if (relationType !== 'module') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function mapRelationRow(row: Record<string, any>) {
  const product = row.product && !Array.isArray(row.product)
    ? row.product
    : Array.isArray(row.product)
      ? row.product[0]
      : null;

  return {
    id: row.id,
    courseId: row.course_id,
    productId: row.product_id,
    relationshipType: row.relationship_type,
    instructorNoteEn: row.instructor_note_en,
    instructorNoteTh: row.instructor_note_th,
    instructorNoteJa: row.instructor_note_ja,
    displayOrder: row.display_order,
    dayIndex: row.day_index,
    relationType: row.relation_type || 'course',
    createdAt: row.created_at,
    product: product
      ? {
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status,
          brand: product.brand,
          imageUrl: product.cover_image_url || product.image_url || null,
        }
      : null,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const supabase = getSupabaseAdmin(extractAccessToken(req));
    const { id } = await params;

    const { data, error } = await supabase
      .from('course_product_relations')
      .select(
        'id, course_id, product_id, relationship_type, instructor_note_en, instructor_note_th, instructor_note_ja, display_order, day_index, relation_type, created_at, product:products(id, name, slug, status, brand, image_url, cover_image_url)',
      )
      .eq('course_id', id)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ relations: (data || []).map((row) => mapRelationRow(row)) });
  } catch (error) {
    console.error('Failed to fetch course product relations:', error);
    return NextResponse.json({ error: 'Failed to fetch course product relations' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const rawRelations = Array.isArray((body as { relations?: unknown[] }).relations)
      ? (body as { relations: unknown[] }).relations
      : [];
    const supabase = getSupabaseAdmin(extractAccessToken(req));

    const relations = rawRelations
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const row = item as Record<string, unknown>;
        const productId = typeof row.product_id === 'string' ? row.product_id.trim() : '';
        if (!productId) {
          return null;
        }

        const relationType = normalizeRelationType(row.relation_type);
        return {
          product_id: productId,
          relationship_type: normalizeRelationshipType(row.relationship_type),
          relation_type: relationType,
          day_index: normalizeDayIndex(row.day_index, relationType),
          instructor_note_en: normalizeText(row.instructor_note_en),
          instructor_note_th: normalizeText(row.instructor_note_th),
          instructor_note_ja: normalizeText(row.instructor_note_ja),
          display_order: index,
        };
      })
      .filter(
        (
          item,
        ): item is {
          product_id: string;
          relationship_type: RelationshipType;
          relation_type: RelationType;
          day_index: number | null;
          instructor_note_en: string | null;
          instructor_note_th: string | null;
          instructor_note_ja: string | null;
          display_order: number;
        } => Boolean(item),
      )
      .filter(
        (item, index, all) =>
          all.findIndex((candidate) => candidate.product_id === item.product_id) === index,
      );

    const productIds = relations.map((relation) => relation.product_id);
    const { data: products, error: productError } = productIds.length
      ? await supabase
          .from('products')
          .select('id')
          .is('deleted_at', null)
          .in('id', productIds)
      : { data: [], error: null };

    if (productError) throw productError;

    if ((products || []).length !== productIds.length) {
      return NextResponse.json({ error: '存在无效器械，无法保存课程关联' }, { status: 400 });
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title')
      .eq('id', id)
      .single();

    if (courseError) throw courseError;

    const { error: deleteError } = await supabase
      .from('course_product_relations')
      .delete()
      .eq('course_id', id);
    if (deleteError) throw deleteError;

    if (relations.length > 0) {
      const { error: insertError } = await supabase.from('course_product_relations').insert(
        relations.map((relation) => ({
          course_id: id,
          product_id: relation.product_id,
          relationship_type: relation.relationship_type,
          relation_type: relation.relation_type,
          day_index: relation.day_index,
          instructor_note_en: relation.instructor_note_en,
          instructor_note_th: relation.instructor_note_th,
          instructor_note_ja: relation.instructor_note_ja,
          display_order: relation.display_order,
          created_by: auth.admin.id,
        })),
      );

      if (insertError) throw insertError;
    }

    const { data: savedRelationsRaw, error: savedRelationsError } = await supabase
      .from('course_product_relations')
      .select(
        'id, course_id, product_id, relationship_type, instructor_note_en, instructor_note_th, instructor_note_ja, display_order, day_index, relation_type, created_at, product:products(id, name, slug, status, brand, image_url, cover_image_url)',
      )
      .eq('course_id', id)
      .order('display_order', { ascending: true });

    if (savedRelationsError) throw savedRelationsError;

    writeAuditLog(req, auth.admin, {
      module: 'course',
      action: 'update_products',
      targetType: 'course',
      targetId: id,
      targetName: (course as { title?: string } | null)?.title ?? null,
      newValue: {
        relations,
      },
      changesSummary: `更新课程关联器械，共 ${relations.length} 项`,
    });

    return NextResponse.json({ relations: (savedRelationsRaw || []).map((row) => mapRelationRow(row)) });
  } catch (error) {
    console.error('Failed to update course product relations:', error);
    return NextResponse.json({ error: 'Failed to update course product relations' }, { status: 500 });
  }
}