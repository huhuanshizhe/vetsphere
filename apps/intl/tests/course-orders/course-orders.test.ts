import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockResolvePurchaseContext = vi.fn();
const mockOrderInsertPayload = vi.fn();
const mockOrderItemsInsert = vi.fn();
const mockEnrollmentUpsert = vi.fn();
const mockExistingEnrollmentSingle = vi.fn();

vi.mock('@vetsphere/shared/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === 'orders') {
        return {
          insert: (payload: Record<string, unknown>) => {
            mockOrderInsertPayload(payload);
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'order-1',
                      order_no: 'VS-20260515-ABCDE',
                    },
                    error: null,
                  }),
              }),
            };
          },
        };
      }

      if (table === 'order_items') {
        return {
          insert: mockOrderItemsInsert,
        };
      }

      if (table === 'course_enrollments') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: mockExistingEnrollmentSingle,
              }),
            }),
          }),
          upsert: mockEnrollmentUpsert,
        };
      }

      throw new Error(`Unexpected table access: ${table}`);
    },
  }),
}));

vi.mock('@vetsphere/shared/lib/course-site-purchase', () => ({
  getPublishedIntlCoursePurchaseContext: (...args: unknown[]) =>
    mockResolvePurchaseContext(...args),
}));

function createRequest(body: Record<string, unknown>, token?: string): any {
  const headers = new Map<string, string>();
  headers.set('content-type', 'application/json');
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  return {
    headers: {
      get: (name: string) => headers.get(name) || null,
    },
    json: () => Promise.resolve(body),
  };
}

let POST: (request: any) => Promise<any>;

beforeEach(async () => {
  vi.resetModules();

  mockGetUser.mockReset().mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });
  mockResolvePurchaseContext.mockReset();
  mockOrderInsertPayload.mockReset();
  mockOrderItemsInsert.mockReset().mockResolvedValue({ error: null });
  mockEnrollmentUpsert.mockReset().mockResolvedValue({ error: null });
  mockExistingEnrollmentSingle.mockReset().mockResolvedValue({ data: null, error: null });

  const mod = await import('../../src/app/api/course-orders/route');
  POST = mod.POST;
});

describe('POST /api/course-orders', () => {
  it('returns 404 when the course is not published on the INTL site', async () => {
    mockResolvePurchaseContext.mockResolvedValue(null);

    const res = await POST(
      createRequest({
        courseId: 'course-1',
        contactName: 'Dr. Li',
        contactEmail: 'doctor@example.com',
        locale: 'en',
      }),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not available');
    expect(mockOrderInsertPayload).not.toHaveBeenCalled();
  });

  it('blocks inquiry-only courses from direct checkout', async () => {
    mockResolvePurchaseContext.mockResolvedValue({
      course_id: 'course-1',
      title: 'Advanced Wet Lab',
      cover_image_url: 'https://example.com/course.jpg',
      price: null,
      currency: 'USD',
      is_free: false,
      pricing_mode: 'custom',
      purchase_mode: 'inquiry',
      max_enrollment: 18,
      current_enrollment: 3,
      enrollment_deadline: '2026-05-20',
    });

    const res = await POST(
      createRequest({
        courseId: 'course-1',
        contactName: 'Dr. Li',
        contactEmail: 'doctor@example.com',
        locale: 'en',
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('direct checkout');
    expect(mockOrderInsertPayload).not.toHaveBeenCalled();
  });

  it('uses the resolved INTL site price and currency instead of client input', async () => {
    mockResolvePurchaseContext.mockResolvedValue({
      course_id: 'course-1',
      title: 'Advanced Wet Lab',
      cover_image_url: 'https://example.com/course.jpg',
      price: 1200,
      currency: 'USD',
      is_free: false,
      pricing_mode: 'inherit',
      purchase_mode: 'direct',
      max_enrollment: 18,
      current_enrollment: 3,
      enrollment_deadline: '2026-05-20',
    });

    const res = await POST(
      createRequest(
        {
          courseId: 'course-1',
          contactName: 'Dr. Li',
          contactEmail: 'doctor@example.com',
          contactPhone: '+1-202-555-0100',
          paymentMethod: 'stripe',
          locale: 'en',
          currency: 'JPY',
        },
        'valid-token',
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.amount).toBe(1200);
    expect(body.currency).toBe('USD');

    expect(mockOrderInsertPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        total_amount: 1200,
        subtotal: 1200,
        currency: 'USD',
      }),
    );
    expect(mockOrderItemsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        product_name: 'Advanced Wet Lab',
        product_sku: 'course:course-1',
        unit_price: 1200,
        total_price: 1200,
      }),
    );
  });
});