import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter
// For production, consider using Redis or a dedicated rate limiting service

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Function to extract the key from the request (default: IP address) */
  keyGenerator?: (request: NextRequest) => string;
  /** Custom error message */
  message?: string;
}

/**
 * Rate limiting middleware
 * 
 * @example
 * ```typescript
 * const rateLimitResult = rateLimit(request, {
 *   maxRequests: 5,
 *   windowMs: 60 * 60 * 1000, // 1 hour
 *   message: 'Too many requests, please try again later.'
 * });
 * 
 * if (rateLimitResult) {
 *   return rateLimitResult; // Return 429 response
 * }
 * ```
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const {
    maxRequests,
    windowMs,
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests. Please try again later.',
  } = config;

  const key = keyGenerator(request);
  const now = Date.now();

  // Get existing entry
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return null; // Allow request
  }

  if (entry.count >= maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    return NextResponse.json(
      {
        error: message,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
        },
      }
    );
  }

  // Increment count
  entry.count++;
  return null; // Allow request
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    // x-forwarded-for may contain multiple IPs, use the first one
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default key
  return 'unknown';
}

/**
 * Key generator that combines IP and email for authentication endpoints
 */
export function authKeyGenerator(request: NextRequest): string {
  const ip = defaultKeyGenerator(request);
  
  // Try to get email from request body for POST requests
  // This is a best-effort approach
  return `auth:${ip}`;
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  /** Strict rate limit for registration (5 per hour) */
  register: (request: NextRequest) =>
    rateLimit(request, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
      message: 'Too many registration attempts. Please try again later.',
      keyGenerator: authKeyGenerator,
    }),

  /** Strict rate limit for password reset (3 per hour) */
  passwordReset: (request: NextRequest) =>
    rateLimit(request, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      message: 'Too many password reset requests. Please check your email or try again later.',
      keyGenerator: authKeyGenerator,
    }),

  /** Moderate rate limit for login (10 per 15 minutes) */
  login: (request: NextRequest) =>
    rateLimit(request, {
      maxRequests: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: 'Too many login attempts. Please try again later.',
      keyGenerator: authKeyGenerator,
    }),

  /** General API rate limit (100 per minute) */
  api: (request: NextRequest) =>
    rateLimit(request, {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
      message: 'Rate limit exceeded. Please slow down.',
    }),
};