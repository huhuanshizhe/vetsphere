import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyAuth(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { userId: user.id };
}

export async function GET(request: NextRequest) {
  try {
    // Verify auth
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify user is a CourseProvider
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.userId)
      .single();

    if (!profile || profile.role !== 'CourseProvider') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get provider's courses
    const { data: providerCourses } = await supabase
      .from('courses')
      .select('id, title, title_zh')
      .eq('provider_id', auth.userId);

    const courseIds = (providerCourses || []).map((c: any) => c.id);
    if (courseIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get all orders and filter for ones containing provider's courses
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    // Filter orders that contain this provider's courses
    const providerOrders = (allOrders || []).filter((order: any) => {
      const items = order.items || [];
      return items.some((item: any) =>
        item.type === 'course' && courseIds.includes(item.id)
      );
    });

    // Get enrollments for these orders
    const orderIds = providerOrders.map((o: any) => o.id);
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('*')
      .in('order_id', orderIds.length > 0 ? orderIds : ['__none__']);

    const enrollmentMap = new Map<string, any[]>();
    (enrollments || []).forEach((e: any) => {
      const list = enrollmentMap.get(e.order_id) || [];
      list.push({
        id: e.id,
        courseId: e.course_id,
        paymentStatus: e.payment_status,
        completionStatus: e.completion_status,
        certificateIssued: e.certificate_issued,
        enrollmentDate: e.enrollment_date,
      });
      enrollmentMap.set(e.order_id, list);
    });

    // Build course name map
    const courseNameMap = new Map<string, string>();
    (providerCourses || []).forEach((c: any) => {
      courseNameMap.set(c.id, c.title_zh || c.title);
    });

    const result = providerOrders.map((o: any) => ({
      id: o.id,
      customerName: o.customer_name,
      customerEmail: o.customer_email,
      items: o.items || [],
      totalAmount: o.total_amount,
      status: o.status,
      date: o.date || o.created_at,
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      currency: o.currency || 'CNY',
      refundStatus: o.refund_status,
      enrollments: enrollmentMap.get(o.id) || [],
      providerCourseIds: courseIds,
      courseNameMap: Object.fromEntries(courseNameMap),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Provider Orders] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
