/**
 * Unit tests for Stripe payment intent creation
 * Tests the critical business logic: auth, amount validation, order ownership
 *
 * These tests mock Supabase and Stripe to test the route handler logic in isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mocks ----

const mockStripeCreate = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSupabaseGetUser = vi.fn();

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      paymentIntents = { create: mockStripeCreate };
    },
  };
});

vi.mock('@vetsphere/shared/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    auth: { getUser: mockSupabaseGetUser },
    from: mockSupabaseFrom,
  }),
}));

// ---- Helpers ----

function createRequest(body: Record<string, unknown>, token?: string): any {
  const headers = new Map<string, string>();
  if (token) headers.set('authorization', `Bearer ${token}`);
  headers.set('content-type', 'application/json');

  return {
    headers: { get: (name: string) => headers.get(name) || null },
    json: () => Promise.resolve(body),
  };
}

function mockOrderQuery(order: Record<string, unknown> | null, error: unknown = null) {
  mockSupabaseFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: order, error }),
      }),
    }),
  });
}

// ---- Import route handler after mocks ----
let POST: (request: any) => Promise<any>;

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_real_key');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

  mockStripeCreate.mockReset();
  mockSupabaseFrom.mockReset();
  mockSupabaseGetUser.mockReset();

  // Default: authenticated user
  mockSupabaseGetUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });

  const mod = await import('../../src/app/api/payment/stripe/create-intent/route');
  POST = mod.POST;
});

describe('POST /api/payment/stripe/create-intent', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const req = createRequest({ orderId: 'order-1', amount: 100 });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects missing orderId/amount with 400', async () => {
    const req = createRequest({}, 'valid-token');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  it('returns 404 when order does not exist', async () => {
    mockOrderQuery(null, { message: 'not found' });

    const req = createRequest({ orderId: 'nonexistent', amount: 100 }, 'valid-token');
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 403 when order belongs to another user', async () => {
    mockOrderQuery({
      id: 'order-1',
      total_amount: 100,
      status: 'Pending',
      user_id: 'other-user',
    });

    const req = createRequest({ orderId: 'order-1', amount: 100 }, 'valid-token');
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 400 when order already paid', async () => {
    mockOrderQuery({
      id: 'order-1',
      total_amount: 100,
      status: 'Paid',
      user_id: 'user-123',
    });

    const req = createRequest({ orderId: 'order-1', amount: 100 }, 'valid-token');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('already paid');
  });

  it('returns 400 when amount does not match order total', async () => {
    mockOrderQuery({
      id: 'order-1',
      total_amount: 99.99,
      status: 'Pending',
      user_id: 'user-123',
    });

    const req = createRequest({ orderId: 'order-1', amount: 50 }, 'valid-token');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Amount mismatch');
  });

  it('creates payment intent for valid request', async () => {
    mockOrderQuery({
      id: 'order-1',
      total_amount: 99.99,
      status: 'Pending',
      user_id: 'user-123',
    });

    mockStripeCreate.mockResolvedValue({
      client_secret: 'pi_secret_test',
      id: 'pi_test_123',
    });

    const req = createRequest(
      { orderId: 'order-1', amount: 99.99, currency: 'usd' },
      'valid-token',
    );
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.clientSecret).toBe('pi_secret_test');
    expect(body.id).toBe('pi_test_123');

    // Verify Stripe was called with correct amount in cents
    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 9999,
        currency: 'usd',
        metadata: expect.objectContaining({
          orderId: 'order-1',
          userId: 'user-123',
        }),
      }),
    );
  });

  it('converts amount to cents correctly for Stripe', async () => {
    mockOrderQuery({
      id: 'order-2',
      total_amount: 1234.56,
      status: 'Pending',
      user_id: 'user-123',
    });

    mockStripeCreate.mockResolvedValue({
      client_secret: 'pi_secret_2',
      id: 'pi_test_456',
    });

    const req = createRequest(
      { orderId: 'order-2', amount: 1234.56, currency: 'eur' },
      'valid-token',
    );
    await POST(req);

    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 123456,
        currency: 'eur',
      }),
    );
  });

  it('returns 503 when Stripe is not configured', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_placeholder');

    vi.resetModules();
    const mod = await import('../../src/app/api/payment/stripe/create-intent/route');

    const req = createRequest({ orderId: 'o', amount: 10 }, 'valid-token');
    const res = await mod.POST(req);
    expect(res.status).toBe(503);
  });
});
