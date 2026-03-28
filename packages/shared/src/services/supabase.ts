import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvxrgbntiksskywsroax.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHJnYm50aWtzc2t5d3Nyb2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDU3MTIsImV4cCI6MjA4NjQyMTcxMn0.xM7u06mRQSCKCoNQwYa2_wEw4he4ZM11iDfyhjfQtDc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Storage URL for images
export const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public`;

// Helper to get full image URL from relative path
export function getImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  // If already absolute URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // If starts with /, prepend storage URL
  if (path.startsWith('/')) return `${STORAGE_URL}${path}`;
  // Otherwise, treat as relative path under uploads bucket
  return `${STORAGE_URL}/uploads/${path}`;
}

// Deduplication wrapper for supabase.auth.getSession()
// Prevents concurrent calls from triggering Web Locks API contention
// which causes "Lock was not released within 5000ms" errors on slow networks.
let _sessionPromise: ReturnType<typeof supabase.auth.getSession> | null = null;

export function getSessionSafe() {
  if (_sessionPromise) {
    return _sessionPromise;
  }
  _sessionPromise = supabase.auth.getSession().finally(() => {
    _sessionPromise = null;
  });
  return _sessionPromise;
}

export async function getAccessTokenSafe(): Promise<string | null> {
  const { data: { session } } = await getSessionSafe();
  return session?.access_token || null;
}
