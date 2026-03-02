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
    const { id: courseId } = await params;

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: 'Failed to fetch product relations' },
        { status: 500 }
      );
    }

    const relations = data
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

    return NextResponse.json({ relations });

  } catch (error) {
    console.error('Course products API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
