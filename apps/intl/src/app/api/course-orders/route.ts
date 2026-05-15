import { NextRequest, NextResponse } from 'next/server';
import { getPublishedIntlCoursePurchaseContext } from '@vetsphere/shared/lib/course-site-purchase';

export const dynamic = 'force-dynamic';

async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `VS-${dateStr}-${random}`;
}

/**
 * POST /api/course-orders - Create a course enrollment order (no shipping)
 */
export async function POST(request: NextRequest) {
  const supabaseAdmin = await getSupabaseAdmin();
  try {
    // Auth (optional - supports guest purchase)
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await request.json();
    const { courseId, contactName, contactEmail, contactPhone, paymentMethod, locale } = body;

    if (!courseId || !contactEmail || !contactName) {
      return NextResponse.json({ error: 'Missing required fields: courseId, contactName, contactEmail' }, { status: 400 });
    }

    const course = await getPublishedIntlCoursePurchaseContext(supabaseAdmin, courseId, locale || 'en');

    if (!course) {
      return NextResponse.json({ error: 'Course is not available for checkout' }, { status: 404 });
    }

    if (course.purchase_mode !== 'direct') {
      return NextResponse.json({ error: 'Course is not available for direct checkout' }, { status: 400 });
    }

    const maxEnroll = course.max_enrollment || 999;
    const currentEnroll = course.current_enrollment || 0;
    if (currentEnroll >= maxEnroll) {
      return NextResponse.json({ error: 'Course is fully booked' }, { status: 400 });
    }

    if (course.enrollment_deadline && new Date(course.enrollment_deadline) < new Date()) {
      return NextResponse.json({ error: 'Enrollment deadline has passed' }, { status: 400 });
    }

    // Check duplicate enrollment
    if (userId) {
      const { data: existingEnrollment } = await supabaseAdmin
        .from('course_enrollments')
        .select('id, payment_status')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (existingEnrollment?.payment_status === 'paid') {
        return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 400 });
      }
    }

    const orderCurrency = course.currency || 'USD';
    const coursePrice = course.price || 0;

    const orderNumber = generateOrderNumber();

    // Create order (no shipping fields)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_no: orderNumber,
        user_id: userId,
        order_type: 'course',
        status: 'pending',
        payment_status: 'pending',
        subtotal: coursePrice,
        shipping_fee: 0,
        tax: 0,
        total_amount: coursePrice,
        currency: orderCurrency,
        email: contactEmail,
        phone: contactPhone || null,
        shipping_name: contactName,
        payment_method: paymentMethod || 'stripe',
        locale: locale || 'en',
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Failed to create course order:', orderError);
      return NextResponse.json({ error: 'Failed to create order', details: orderError?.message }, { status: 500 });
    }

    // Create order item (product_id 为 null，因为课程ID不在 products 表中)
    await supabaseAdmin.from('order_items').insert({
      order_id: order.id,
      product_id: null,
      product_name: course.title || 'Course',
      product_sku: `course:${courseId}`,
      product_image: course.cover_image_url || '',
      unit_price: coursePrice,
      quantity: 1,
      total_price: coursePrice,
    });

    // Create course enrollment
    if (userId) {
      const { error: enrollError } = await supabaseAdmin
        .from('course_enrollments')
        .upsert({
          user_id: userId,
          course_id: courseId,
          order_id: order.id,
          payment_status: 'pending',
          completion_status: 'enrolled',
        }, { onConflict: 'user_id,course_id' });

      if (enrollError) {
        console.error('Failed to create enrollment:', enrollError);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_no,
      amount: coursePrice,
      currency: orderCurrency,
    });
  } catch (error) {
    console.error('Course order creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
