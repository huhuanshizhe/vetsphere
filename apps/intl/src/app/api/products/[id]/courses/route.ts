import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json(
        { error: 'Failed to fetch course relations' },
        { status: 500 }
      );
    }

    // Filter to only include published courses and map to client format
    // Note: Supabase returns joined relations - cast through unknown for type safety
    const relations = data
      .filter(item => {
        const course = item.course as unknown as Record<string, unknown> | null;
        return course && course.status === 'Published';
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

    return NextResponse.json({ relations });

  } catch (error) {
    console.error('Course relations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
