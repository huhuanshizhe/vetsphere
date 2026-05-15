export type CourseOrderPaymentStatus = 'paid' | 'refunded';

interface SupabaseLike {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => any;
}

interface OrderItemLike {
  product_sku?: string | null;
  quantity?: number | null;
}

interface FinalizeCourseOrderPaymentOptions {
  orderId: string;
  paymentStatus: CourseOrderPaymentStatus;
  orderUpdate?: Record<string, unknown>;
}

interface FinalizeCourseOrderPaymentResult {
  changed: boolean;
  courseIds: string[];
}

function normalizeStatus(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function extractCourseQuantitiesFromOrderItems(orderItems: OrderItemLike[]): Map<string, number> {
  const courseQuantities = new Map<string, number>();

  for (const item of orderItems) {
    const sku = typeof item.product_sku === 'string' ? item.product_sku.trim() : '';
    if (!sku.toLowerCase().startsWith('course:')) {
      continue;
    }

    const courseId = sku.slice(7).trim();
    if (!courseId) {
      continue;
    }

    const quantity =
      typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0
        ? Math.floor(item.quantity)
        : 1;
    courseQuantities.set(courseId, (courseQuantities.get(courseId) || 0) + quantity);
  }

  return courseQuantities;
}

async function loadCourseQuantitiesForOrder(
  supabase: SupabaseLike,
  orderId: string,
): Promise<Map<string, number>> {
  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('product_sku, quantity')
    .eq('order_id', orderId);

  if (orderItemsError) {
    throw new Error(orderItemsError.message || 'Failed to load order items');
  }

  const courseQuantities = extractCourseQuantitiesFromOrderItems(orderItems || []);
  if (courseQuantities.size > 0) {
    return courseQuantities;
  }

  const { data: enrollments, error: enrollmentError } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('order_id', orderId);

  if (enrollmentError) {
    throw new Error(enrollmentError.message || 'Failed to load course enrollments');
  }

  const fallbackQuantities = new Map<string, number>();
  for (const enrollment of enrollments || []) {
    const courseId = typeof enrollment.course_id === 'string' ? enrollment.course_id.trim() : '';
    if (!courseId) {
      continue;
    }

    fallbackQuantities.set(courseId, (fallbackQuantities.get(courseId) || 0) + 1);
  }

  return fallbackQuantities;
}

async function incrementCourseEnrollment(
  supabase: SupabaseLike,
  courseId: string,
  quantity: number,
): Promise<void> {
  for (let index = 0; index < quantity; index += 1) {
    const { error } = await supabase.rpc('increment_course_enrollment', { p_course_id: courseId });
    if (error) {
      throw new Error(error.message || `Failed to increment enrollment for ${courseId}`);
    }
  }
}

async function decrementCourseEnrollment(
  supabase: SupabaseLike,
  courseId: string,
  quantity: number,
): Promise<void> {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('current_enrollment')
    .eq('id', courseId)
    .single();

  if (courseError) {
    throw new Error(courseError.message || `Failed to load course ${courseId}`);
  }

  const currentEnrollment =
    typeof course?.current_enrollment === 'number' && Number.isFinite(course.current_enrollment)
      ? course.current_enrollment
      : 0;
  const nextEnrollment = Math.max(0, currentEnrollment - quantity);
  const { error: updateError } = await supabase
    .from('courses')
    .update({ current_enrollment: nextEnrollment })
    .eq('id', courseId);

  if (updateError) {
    throw new Error(updateError.message || `Failed to decrement enrollment for ${courseId}`);
  }
}

export async function finalizeCourseOrderPayment(
  supabase: SupabaseLike,
  options: FinalizeCourseOrderPaymentOptions,
): Promise<FinalizeCourseOrderPaymentResult> {
  const { orderId, paymentStatus, orderUpdate = {} } = options;
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, payment_status, order_type')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message || 'Order not found');
  }

  const previousPaymentStatus = normalizeStatus(order.payment_status || order.status);
  if (previousPaymentStatus === paymentStatus) {
    return { changed: false, courseIds: [] };
  }

  const courseQuantities = await loadCourseQuantitiesForOrder(supabase, orderId);
  const courseIds = Array.from(courseQuantities.keys());

  const normalizedOrderStatus = paymentStatus === 'paid' ? 'paid' : 'refunded';
  const { error: updateOrderError } = await supabase
    .from('orders')
    .update({
      status: normalizedOrderStatus,
      payment_status: paymentStatus,
      ...orderUpdate,
    })
    .eq('id', orderId);

  if (updateOrderError) {
    throw new Error(updateOrderError.message || 'Failed to update order');
  }

  if (courseIds.length > 0 || normalizeStatus(order.order_type) === 'course') {
    const enrollmentUpdate =
      paymentStatus === 'paid'
        ? { payment_status: 'paid' }
        : { payment_status: 'refunded', completion_status: 'dropped' };

    const { error: enrollmentError } = await supabase
      .from('course_enrollments')
      .update(enrollmentUpdate)
      .eq('order_id', orderId);

    if (enrollmentError) {
      throw new Error(enrollmentError.message || 'Failed to update course enrollments');
    }
  }

  if (paymentStatus === 'paid') {
    for (const [courseId, quantity] of courseQuantities.entries()) {
      await incrementCourseEnrollment(supabase, courseId, quantity);
    }
  }

  if (paymentStatus === 'refunded' && previousPaymentStatus === 'paid') {
    for (const [courseId, quantity] of courseQuantities.entries()) {
      await decrementCourseEnrollment(supabase, courseId, quantity);
    }
  }

  return {
    changed: true,
    courseIds,
  };
}