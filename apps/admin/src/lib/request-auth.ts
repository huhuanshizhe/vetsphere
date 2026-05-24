import type { NextRequest } from 'next/server';

export function extractAccessToken(req: NextRequest): string | undefined {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return undefined;
  if (!header.toLowerCase().startsWith('bearer ')) return undefined;
  const token = header.slice(7).trim();
  return token || undefined;
}