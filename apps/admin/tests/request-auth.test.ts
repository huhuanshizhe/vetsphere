import { describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import { extractAccessToken } from '../src/lib/request-auth';

function createRequest(headerValue?: string, headerName = 'authorization') {
  return {
    headers: {
      get(name: string) {
        if (name === headerName) {
          return headerValue || null;
        }
        return null;
      },
    },
  } as NextRequest;
}

describe('extractAccessToken', () => {
  it('parses bearer tokens from the standard authorization header', () => {
    expect(extractAccessToken(createRequest('Bearer test-token'))).toBe('test-token');
  });

  it('parses bearer tokens from an uppercase Authorization header name', () => {
    expect(extractAccessToken(createRequest('Bearer second-token', 'Authorization'))).toBe('second-token');
  });

  it('returns undefined for non-bearer or empty headers', () => {
    expect(extractAccessToken(createRequest('Basic abc123'))).toBeUndefined();
    expect(extractAccessToken(createRequest('Bearer    '))).toBeUndefined();
    expect(extractAccessToken(createRequest())).toBeUndefined();
  });
});