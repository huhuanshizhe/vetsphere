

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

import { SEED_COURSE_PRODUCT_RELATIONS } from '@vetsphere/shared/lib/constants';






async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseAdmin();
  try {
    const { id: courseId } = await params;

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Get course-product relations with product details
    const { data, error } = await supabase
      .from('course_product_relations')
      .select(`
        id,
        course_id,
        product_id,
        relationship_type,
        instructor_note_en,
        instructor_note_th,
        instructor_note_ja,
        display_order,
        day_index,
        relation_type,
        created_at,
        product:products(
          id,
          name,
          brand,
          price,
          specialty,
          group_category,
          image_url,
          description,
          stock_status,
          purchase_mode,
          clinical_category
        )
      `)
      .eq('course_id', courseId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching product relations:', error);
      // Fall through to seed data fallback below
    }

    // Filter to only include published products and map to client format
    const relations = (data || [])
      .filter(item => {
        const product = item.product as unknown as Record<string, unknown> | null;
        return product && product.id;
      })
      .map(item => {
        const product = item.product as unknown as Record<string, unknown> | null;
        return {
          id: item.id,
          courseId: item.course_id,
          productId: item.product_id,
          relationshipType: item.relationship_type,
          instructorNoteEn: item.instructor_note_en,
          instructorNoteTh: item.instructor_note_th,
          instructorNoteJa: item.instructor_note_ja,
          displayOrder: item.display_order,
          dayIndex: item.day_index ?? null,
          relationType: item.relation_type || 'course',
          createdAt: item.created_at,
          product: product ? {
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            specialty: product.specialty,
            group: product.group_category,
            imageUrl: product.image_url,
            description: product.description,
            stockStatus: product.stock_status,
            purchaseMode: product.purchase_mode,
            clinicalCategory: product.clinical_category,
          } : null,
        };
      });

    // If DB returned results, use them
    if (relations.length > 0) {
      return NextResponse.json({ relations });
    }

    // ── Mock fallback: use seed data when DB is empty ──
    const seedRelations = SEED_COURSE_PRODUCT_RELATIONS[courseId] || [];
    const fallback = seedRelations.map(r => ({
      id: r.id,
      courseId: r.courseId,
      productId: r.productId,
      relationshipType: r.relationshipType,
      instructorNoteEn: r.instructorNoteEn || null,
      instructorNoteTh: r.instructorNoteTh || null,
      instructorNoteJa: r.instructorNoteJa || null,
      displayOrder: r.displayOrder,
      dayIndex: r.dayIndex ?? null,
      relationType: r.relationType || 'course',
      createdAt: null,
      product: r.product ? {
        id: r.product.id,
        name: r.product.name,
        brand: r.product.brand,
        price: r.product.price,
        specialty: r.product.specialty,
        group: r.product.group,
        imageUrl: r.product.imageUrl,
        description: r.product.description,
        stockStatus: r.product.stockStatus,
        purchaseMode: r.product.purchaseMode || 'direct',
        clinicalCategory: r.product.clinicalCategory || null,
      } : null,
    }));

    return NextResponse.json({ relations: fallback });

  } catch (error) {
    console.error('Course products API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
