import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// GET - Fetch course-product relations for a specific course
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
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
          image_url,
          status
        )
      `)
      .eq('course_id', courseId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching relations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch relations' },
        { status: 500 }
      );
    }

    // Map to client format
    const relations = data.map(item => {
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
          imageUrl: product.image_url,
          status: product.status,
        } : null,
      };
    });

    return NextResponse.json({ relations });

  } catch (error) {
    console.error('Admin course-products GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add, update, or remove course-product relations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, courseId, productId, relationId, relationshipType, instructorNoteEn, instructorNoteTh, instructorNoteJa, dayIndex, relationType } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    // ADD - Create new relation
    if (action === 'add') {
      if (!courseId || !productId) {
        return NextResponse.json(
          { error: 'courseId and productId are required for add action' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('course_product_relations')
        .insert({
          course_id: courseId,
          product_id: productId,
          relationship_type: relationshipType || 'recommended',
          instructor_note_en: instructorNoteEn || null,
          instructor_note_th: instructorNoteTh || null,
          instructor_note_ja: instructorNoteJa || null,
          day_index: dayIndex ?? null,
          relation_type: relationType || 'course',
          display_order: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding relation:', error);
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'This product is already linked to this course' },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: 'Failed to add relation' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        relation: {
          id: data.id,
          courseId: data.course_id,
          productId: data.product_id,
          relationshipType: data.relationship_type,
          instructorNoteEn: data.instructor_note_en,
          instructorNoteTh: data.instructor_note_th,
          instructorNoteJa: data.instructor_note_ja,
          displayOrder: data.display_order,
          dayIndex: data.day_index ?? null,
          relationType: data.relation_type || 'course',
          createdAt: data.created_at,
        },
      });
    }

    // UPDATE - Update relation type or notes
    if (action === 'update') {
      if (!relationId) {
        return NextResponse.json(
          { error: 'relationId is required for update action' },
          { status: 400 }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (relationshipType) updateData.relationship_type = relationshipType;
      if (instructorNoteEn !== undefined) updateData.instructor_note_en = instructorNoteEn;
      if (instructorNoteTh !== undefined) updateData.instructor_note_th = instructorNoteTh;
      if (instructorNoteJa !== undefined) updateData.instructor_note_ja = instructorNoteJa;
      if (dayIndex !== undefined) updateData.day_index = dayIndex;
      if (relationType !== undefined) updateData.relation_type = relationType;

      const { error } = await supabase
        .from('course_product_relations')
        .update(updateData)
        .eq('id', relationId);

      if (error) {
        console.error('Error updating relation:', error);
        return NextResponse.json(
          { error: 'Failed to update relation' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // REMOVE - Delete relation
    if (action === 'remove') {
      if (!relationId) {
        return NextResponse.json(
          { error: 'relationId is required for remove action' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('course_product_relations')
        .delete()
        .eq('id', relationId);

      if (error) {
        console.error('Error removing relation:', error);
        return NextResponse.json(
          { error: 'Failed to remove relation' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: add, update, or remove' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Admin course-products POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
