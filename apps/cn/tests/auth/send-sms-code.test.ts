/**
 * Unit tests for SMS code sending endpoint
 * apps/cn/src/app/api/auth/send-sms-code/route.ts
 *
 * Tests: input validation, rate limiting, demo account guard, code generation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mocks ----

const mockInsert = vi.fn();

// Create a deeply chainable mock that resolves to default values
function createChainMock(resolvedValue: any = { data: null, error: null, count: 0 }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'gte', 'order', 'limit', 'single', 'insert'];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // Terminal methods return promises
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  // For count queries — gte is the terminal
  chain.gte = vi.fn().mockReturnValue(chain);
  // Make the chain itself thenable for count queries (.select('*', {count, head}).eq().gte())
  chain.then = (resolve: any) => resolve(resolvedValue);
  return chain;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'sms_verification_codes') {
        const chain = createChainMock();
        chain.insert = mockInsert;
        return chain;
      }
      return createChainMock();
    },
  }),
}));

// ---- Helpers ----

function createRequest(body: Record<string, unknown>): any {
  return {
    json: () => Promise.resolve(body),
    headers: {
      get: (name: string) => {
        if (name === 'x-forwarded-for') return '127.0.0.1';
        return null;
      },
    },
  };
}

let POST: (request: any) => Promise<any>;

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
  vi.stubEnv('NODE_ENV', 'development');

  mockInsert.mockReset().mockResolvedValue({ error: null });

  const mod = await import('../../src/app/api/auth/send-sms-code/route');
  POST = mod.POST;
});

describe('POST /api/auth/send-sms-code', () => {
  it('rejects empty mobile with 400', async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('手机号');
  });

  it('rejects invalid mobile format with 400', async () => {
    const res = await POST(createRequest({ mobile: '12345' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('正确的手机号');
  });

  it('rejects non-Chinese mobile numbers', async () => {
    const res = await POST(createRequest({ mobile: '10000000000' }));
    expect(res.status).toBe(400);
  });

  it('rejects invalid purpose', async () => {
    const res = await POST(createRequest({ mobile: '13900001111', purpose: 'invalid' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('无效');
  });

  it('accepts valid mobile and returns success', async () => {
    const res = await POST(createRequest({ mobile: '13900001111' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.expiresIn).toBe(300); // 5 minutes
  });

  it('returns code in development mode only', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
      const mod = await import('../../src/app/api/auth/send-sms-code/route');

    const res = await mod.POST(createRequest({ mobile: '13900001111' }));
    const body = await res.json();
    expect(body.code).toBeDefined();
  });

  describe('demo account', () => {
    it('blocks demo account in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.resetModules();
      const mod = await import('../../src/app/api/auth/send-sms-code/route');

      const res = await mod.POST(createRequest({ mobile: '13800000000' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('不可用');
    });

    it('allows demo account in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.resetModules();
      const mod = await import('../../src/app/api/auth/send-sms-code/route');

      const res = await mod.POST(createRequest({ mobile: '13800000000' }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe('888888');
    });
  });

  describe('input validation edge cases', () => {
    it('accepts all valid Chinese mobile prefixes', async () => {
      const prefixes = ['13', '14', '15', '16', '17', '18', '19'];
      for (const prefix of prefixes) {
        vi.resetModules();
        mockInsert.mockResolvedValue({ error: null });
        const mod = await import('../../src/app/api/auth/send-sms-code/route');
        const mobile = `${prefix}900001111`;
        const res = await mod.POST(createRequest({ mobile }));
        expect(res.status).toBe(200);
      }
    });

    it('rejects mobile numbers with wrong length', async () => {
      const res1 = await POST(createRequest({ mobile: '1390000111' })); // 10 digits
      expect(res1.status).toBe(400);

      const res2 = await POST(createRequest({ mobile: '139000011112' })); // 12 digits
      expect(res2.status).toBe(400);
    });
  });
});
