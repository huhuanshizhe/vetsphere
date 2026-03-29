

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

import { SEED_COURSE_PRODUCT_RELATIONS, COURSES } from '@vetsphere/shared/lib/constants';






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
    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get course-product relations with course details
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
        created_at,
        course:courses(
          id,
          title,
          title_th,
          title_ja,
          description,
          specialty,
          level,
          price,
          currency,
          start_date,
          end_date,
          image_url,
          location,
          instructor,
          status
        )
      `)
      .eq('product_id', productId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching course relations:', error);
    }

    // Filter to only include published courses and map to client format
    const relations = (data || [])
      .filter(item => {
        const course = item.course as unknown as Record<string, unknown> | null;
        return course && course.status === 'published';
      })
      .map(item => {
        const course = item.course as unknown as Record<string, unknown> | null;
        return {
          id: item.id,
          courseId: item.course_id,
          productId: item.product_id,
          relationshipType: item.relationship_type,
          instructorNoteEn: item.instructor_note_en,
          instructorNoteTh: item.instructor_note_th,
          instructorNoteJa: item.instructor_note_ja,
          displayOrder: item.display_order,
          createdAt: item.created_at,
          course: course ? {
            id: course.id,
            title: course.title,
            title_th: course.title_th,
            title_ja: course.title_ja,
            description: course.description,
            specialty: course.specialty,
            level: course.level,
            price: course.price,
            currency: course.currency,
            startDate: course.start_date,
            endDate: course.end_date,
            imageUrl: course.image_url,
            location: course.location,
            instructor: course.instructor,
            status: course.status,
          } : null,
        };
      });

    if (relations.length > 0) {
      return NextResponse.json({ relations });
    }

    // Mock fallback: reverse-lookup seed data by productId
    const courseMap = Object.fromEntries(COURSES.map(c => [c.id, c]));
    const fallback: Array<Record<string, unknown>> = [];

    for (const [courseId, rels] of Object.entries(SEED_COURSE_PRODUCT_RELATIONS)) {
      for (const r of rels) {
        if (r.productId === productId) {
          const course = courseMap[courseId];
          if (course && course.status === 'published') {
            fallback.push({
              id: r.id,
              courseId: r.courseId,
              productId: r.productId,
              relationshipType: r.relationshipType,
              instructorNoteEn: r.instructorNoteEn || null,
              instructorNoteTh: r.instructorNoteTh || null,
              instructorNoteJa: r.instructorNoteJa || null,
              displayOrder: r.displayOrder,
              createdAt: null,
              course: {
                id: course.id,
                title: course.title,
                description: course.description,
                specialty: course.specialty,
                level: course.level,
                price: course.price,
                currency: course.currency,
                startDate: course.startDate,
                endDate: course.endDate,
                imageUrl: course.imageUrl,
                location: course.location,
                instructor: course.instructor,
                status: course.status,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ relations: fallback });

  } catch (error) {
    console.error('Course relations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
