import { beforeEach, describe, expect, it } from 'vitest';

import {
  extractCourseQuantitiesFromOrderItems,
  finalizeCourseOrderPayment,
} from '../../src/lib/course-order-payment';

function createSupabaseMock() {
  const state = {
    order: {
      id: 'order-1',
      status: 'pending',
      payment_status: 'pending',
      order_type: 'course',
    },
    orderItems: [
      {
        order_id: 'order-1',
        product_sku: 'course:course-1',
        quantity: 1,
      },
    ],
    enrollments: [
      {
        order_id: 'order-1',
        course_id: 'course-1',
        payment_status: 'pending',
        completion_status: 'enrolled',
      },
    ],
    courses: {
      'course-1': {
        id: 'course-1',
        current_enrollment: 2,
      },
    } as Record<string, { id: string; current_enrollment: number }>,
    rpcCalls: [] as string[],
  };

  const supabase = {
    from(table: string) {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              single: async () => ({
                data: value === state.order.id ? { ...state.order } : null,
                error: value === state.order.id ? null : { message: 'Order not found' },
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async (_column: string, value: string) => {
              if (value === state.order.id) {
                state.order = { ...state.order, ...patch };
              }

              return { data: null, error: null };
            },
          }),
        };
      }

      if (table === 'order_items') {
        return {
          select: () => ({
            eq: async (_column: string, value: string) => ({
              data: state.orderItems.filter((item) => item.order_id === value),
              error: null,
            }),
          }),
        };
      }

      if (table === 'course_enrollments') {
        return {
          select: () => ({
            eq: async (_column: string, value: string) => ({
              data: state.enrollments.filter((enrollment) => enrollment.order_id === value),
              error: null,
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async (_column: string, value: string) => {
              state.enrollments = state.enrollments.map((enrollment) =>
                enrollment.order_id === value ? { ...enrollment, ...patch } : enrollment,
              );
              return { data: null, error: null };
            },
          }),
        };
      }

      if (table === 'courses') {
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              single: async () => ({
                data: state.courses[value] ? { ...state.courses[value] } : null,
                error: state.courses[value] ? null : { message: 'Course not found' },
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async (_column: string, value: string) => {
              state.courses[value] = {
                ...state.courses[value],
                ...patch,
              };
              return { data: null, error: null };
            },
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'increment_course_enrollment') {
        const courseId = String(args.p_course_id || '');
        state.rpcCalls.push(courseId);
        state.courses[courseId].current_enrollment += 1;
        return { error: null };
      }

      return { error: { message: `Unexpected rpc: ${fn}` } };
    },
  };

  return { supabase, state };
}

describe('extractCourseQuantitiesFromOrderItems', () => {
  it('parses course product_sku values and aggregates quantities', () => {
    const quantities = extractCourseQuantitiesFromOrderItems([
      { product_sku: 'course:course-1', quantity: 1 },
      { product_sku: 'course:course-1', quantity: 2 },
      { product_sku: 'product:sku-1', quantity: 5 },
      { product_sku: 'course:course-2', quantity: null },
    ]);

    expect(Array.from(quantities.entries())).toEqual([
      ['course-1', 3],
      ['course-2', 1],
    ]);
  });
});

describe('finalizeCourseOrderPayment', () => {
  let context: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    context = createSupabaseMock();
  });

  it('marks a course order paid and increments current_enrollment exactly once', async () => {
    const result = await finalizeCourseOrderPayment(context.supabase as any, {
      orderId: 'order-1',
      paymentStatus: 'paid',
      orderUpdate: {
        payment_method: 'stripe',
      },
    });

    expect(result).toEqual({ changed: true, courseIds: ['course-1'] });
    expect(context.state.order.status).toBe('paid');
    expect(context.state.order.payment_status).toBe('paid');
    expect(context.state.enrollments[0].payment_status).toBe('paid');
    expect(context.state.courses['course-1'].current_enrollment).toBe(3);
    expect(context.state.rpcCalls).toEqual(['course-1']);
  });

  it('is idempotent when the order is already paid', async () => {
    context.state.order.status = 'Paid';
    context.state.order.payment_status = 'paid';

    const result = await finalizeCourseOrderPayment(context.supabase as any, {
      orderId: 'order-1',
      paymentStatus: 'paid',
    });

    expect(result).toEqual({ changed: false, courseIds: [] });
    expect(context.state.courses['course-1'].current_enrollment).toBe(2);
    expect(context.state.rpcCalls).toEqual([]);
  });

  it('marks refunded paid orders as dropped and decrements current_enrollment', async () => {
    context.state.order.status = 'paid';
    context.state.order.payment_status = 'paid';
    context.state.enrollments[0].payment_status = 'paid';

    const result = await finalizeCourseOrderPayment(context.supabase as any, {
      orderId: 'order-1',
      paymentStatus: 'refunded',
    });

    expect(result).toEqual({ changed: true, courseIds: ['course-1'] });
    expect(context.state.order.status).toBe('refunded');
    expect(context.state.order.payment_status).toBe('refunded');
    expect(context.state.enrollments[0]).toMatchObject({
      payment_status: 'refunded',
      completion_status: 'dropped',
    });
    expect(context.state.courses['course-1'].current_enrollment).toBe(1);
  });
});