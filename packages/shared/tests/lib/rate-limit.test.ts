/**
 * Unit tests for rate-limit utility
 * packages/shared/src/lib/rate-limit.ts
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// We need to mock setInterval before importing the module
vi.useFakeTimers();

// Mock NextRequest and NextResponse
const createMockRequest = (
  ip = '127.0.0.1',
  headers: Record<string, string> = {},
): any => ({
  headers: {
    get: (name: string) => {
      if (name === 'x-forwarded-for' && !headers['x-forwarded-for']) return ip;
      return headers[name] || null;
    },
  },
});

// We need to dynamically import after mocking
let rateLimit: typeof import('@vetsphere/shared/lib/rate-limit').rateLimit;
let rateLimiters: typeof import('@vetsphere/shared/lib/rate-limit').rateLimiters;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../../src/lib/rate-limit');
  rateLimit = mod.rateLimit;
  rateLimiters = mod.rateLimiters;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rateLimit', () => {
  it('allows requests under the limit', () => {
    const req = createMockRequest('10.0.0.1');
    const result = rateLimit(req, { maxRequests: 3, windowMs: 60_000 });
    expect(result).toBeNull();
  });

  it('allows exactly maxRequests before blocking', () => {
    const req = createMockRequest('10.0.0.2');
    const config = { maxRequests: 3, windowMs: 60_000 };

    expect(rateLimit(req, config)).toBeNull(); // 1
    expect(rateLimit(req, config)).toBeNull(); // 2
    expect(rateLimit(req, config)).toBeNull(); // 3

    const blocked = rateLimit(req, config);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it('returns 429 with Retry-After header when limit exceeded', async () => {
    const req = createMockRequest('10.0.0.3');
    const config = { maxRequests: 1, windowMs: 60_000 };

    rateLimit(req, config); // 1
    const blocked = rateLimit(req, config); // 2 → blocked

    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get('Retry-After')).toBeTruthy();
    expect(blocked!.headers.get('X-RateLimit-Remaining')).toBe('0');

    const body = await blocked!.json();
    expect(body.error).toBeDefined();
    expect(body.retryAfter).toBeGreaterThan(0);
  });

  it('resets count after window expires', () => {
    const req = createMockRequest('10.0.0.4');
    const config = { maxRequests: 1, windowMs: 60_000 };

    expect(rateLimit(req, config)).toBeNull(); // 1
    expect(rateLimit(req, config)).not.toBeNull(); // blocked

    // Advance time past the window
    vi.advanceTimersByTime(61_000);

    expect(rateLimit(req, config)).toBeNull(); // allowed again
  });

  it('tracks different IPs separately', () => {
    const config = { maxRequests: 1, windowMs: 60_000 };

    const req1 = createMockRequest('1.1.1.1');
    const req2 = createMockRequest('2.2.2.2');

    expect(rateLimit(req1, config)).toBeNull();
    expect(rateLimit(req2, config)).toBeNull(); // different IP, allowed

    expect(rateLimit(req1, config)).not.toBeNull(); // same IP, blocked
    expect(rateLimit(req2, config)).not.toBeNull(); // same IP, blocked
  });

  it('uses custom keyGenerator when provided', () => {
    const config = {
      maxRequests: 1,
      windowMs: 60_000,
      keyGenerator: () => 'fixed-key',
    };

    const req1 = createMockRequest('1.1.1.1');
    const req2 = createMockRequest('2.2.2.2');

    expect(rateLimit(req1, config)).toBeNull();
    // Same key despite different IP → blocked
    expect(rateLimit(req2, config)).not.toBeNull();
  });

  it('uses custom error message', async () => {
    const config = {
      maxRequests: 1,
      windowMs: 60_000,
      message: 'Custom error message',
    };

    const req = createMockRequest('10.0.0.5');
    rateLimit(req, config);
    const blocked = rateLimit(req, config);

    const body = await blocked!.json();
    expect(body.error).toBe('Custom error message');
  });

  it('extracts IP from x-real-ip header', () => {
    const req = createMockRequest('', { 'x-real-ip': '3.3.3.3' });
    const config = { maxRequests: 1, windowMs: 60_000 };

    expect(rateLimit(req, config)).toBeNull();
  });

  it('extracts IP from cf-connecting-ip header', () => {
    const req = createMockRequest('', {
      'cf-connecting-ip': '4.4.4.4',
    });
    const config = { maxRequests: 1, windowMs: 60_000 };

    expect(rateLimit(req, config)).toBeNull();
  });
});

describe('rateLimiters presets', () => {
  it('register limiter allows 5 requests per hour', () => {
    const req = createMockRequest('20.0.0.1');

    for (let i = 0; i < 5; i++) {
      expect(rateLimiters.register(req)).toBeNull();
    }
    expect(rateLimiters.register(req)).not.toBeNull();
  });

  it('passwordReset limiter allows 3 requests per hour', () => {
    const req = createMockRequest('20.0.0.2');

    for (let i = 0; i < 3; i++) {
      expect(rateLimiters.passwordReset(req)).toBeNull();
    }
    expect(rateLimiters.passwordReset(req)).not.toBeNull();
  });
});
