import { NextRequest, NextResponse } from 'next/server';
import {
  buildCourseInstructorNames,
  normalizeCourseInstructorRelations,
} from '@/lib/course-structured-content';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type CourseInstructorRole = 'instructor' | 'assistant' | 'guest';

function extractAccessToken(req: NextRequest): string | undefined {
  const authorization = req.headers.get('authorization')?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }

  const token = authorization.slice(7).trim();
  return token || undefined;
}

function normalizeInstructorRole(value: unknown): CourseInstructorRole {
  if (value === 'instructor' || value === 'assistant' || value === 'guest') {
    return value;
  }

  return 'assistant';
}

function normalizeRelationsPayload(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const row = item as Record<string, unknown>;
      const instructorId = typeof row.instructor_id === 'string' ? row.instructor_id.trim() : '';
      if (!instructorId) {
        return null;
      }

      return {
        instructor_id: instructorId,
        role: normalizeInstructorRole(row.role),
        display_order:
          typeof row.display_order === 'number' && Number.isFinite(row.display_order)
            ? row.display_order
            : index,
      };
    })
    .filter((item): item is { instructor_id: string; role: CourseInstructorRole; display_order: number } => Boolean(item))
    .filter(
      (item, index, all) =>
        all.findIndex((candidate) => candidate.instructor_id === item.instructor_id) === index,
    )
    .sort((left, right) => left.display_order - right.display_order)
    .map((item, index) => ({ ...item, display_order: index }));
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
    const relations = normalizeRelationsPayload((body as { relations?: unknown }).relations);
    const supabase = getSupabaseAdmin(extractAccessToken(req));

    const instructorIds = relations.map((relation) => relation.instructor_id);
    const { data: instructors, error: instructorError } = instructorIds.length
      ? await supabase
          .from('instructors')
          .select('id, name, title, avatar_url, credentials, bio')
          .in('id', instructorIds)
      : { data: [], error: null };

    if (instructorError) throw instructorError;

    if ((instructors || []).length !== instructorIds.length) {
      return NextResponse.json({ error: '存在无效讲师，无法保存授课团队' }, { status: 400 });
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title, instructor')
      .eq('id', id)
      .single();

    if (courseError) throw courseError;

    const { error: deleteError } = await supabase.from('course_instructors').delete().eq('course_id', id);
    if (deleteError) throw deleteError;

    if (relations.length > 0) {
      const { error: insertError } = await supabase.from('course_instructors').insert(
        relations.map((relation) => ({
          course_id: id,
          instructor_id: relation.instructor_id,
          role: relation.role,
          display_order: relation.display_order,
        })),
      );

      if (insertError) throw insertError;
    }

    const { data: savedRelationsRaw, error: savedRelationsError } = await supabase
      .from('course_instructors')
      .select(
        'id, role, display_order, instructor:instructors(id, name, title, avatar_url, credentials, bio)',
      )
      .eq('course_id', id)
      .order('display_order', { ascending: true });

    if (savedRelationsError) throw savedRelationsError;

    const savedRelations = normalizeCourseInstructorRelations(savedRelationsRaw || []);
    const instructorNames = buildCourseInstructorNames(savedRelations);
    const leadInstructor = savedRelations[0]?.instructor || null;

    const currentInstructor =
      course?.instructor && typeof course.instructor === 'object' && !Array.isArray(course.instructor)
        ? (course.instructor as Record<string, unknown>)
        : {};

    const updatePayload: Record<string, unknown> = {
      instructor_names: instructorNames,
    };

    if (
      leadInstructor &&
      (!currentInstructor.name || typeof currentInstructor.name !== 'string' || !currentInstructor.name.trim())
    ) {
      updatePayload.instructor = {
        ...currentInstructor,
        name: leadInstructor.name,
        title: currentInstructor.title || leadInstructor.title || '',
        imageUrl:
          (typeof currentInstructor.imageUrl === 'string' && currentInstructor.imageUrl.trim()) ||
          leadInstructor.avatar_url ||
          '',
        credentials:
          Array.isArray(currentInstructor.credentials) && currentInstructor.credentials.length > 0
            ? currentInstructor.credentials
            : leadInstructor.credentials,
        bio:
          (typeof currentInstructor.bio === 'string' && currentInstructor.bio.trim()) ||
          leadInstructor.bio ||
          '',
      };
    }

    const { error: updateCourseError } = await supabase.from('courses').update(updatePayload).eq('id', id);
    if (updateCourseError) throw updateCourseError;

    writeAuditLog(req, auth.admin, {
      module: 'course',
      action: 'update_instructors',
      targetType: 'course',
      targetId: id,
      targetName: (course as { title?: string } | null)?.title ?? null,
      newValue: {
        relations,
      },
      changesSummary: `更新课程授课团队，共 ${savedRelations.length} 位讲师`,
    });

    return NextResponse.json({
      relations: savedRelations,
      instructorNames,
      leadInstructor,
    });
  } catch (error) {
    console.error('Failed to update course instructors:', error);
    return NextResponse.json({ error: 'Failed to update course instructors' }, { status: 500 });
  }
}