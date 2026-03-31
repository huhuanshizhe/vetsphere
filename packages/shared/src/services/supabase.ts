import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use environment variables with fallbacks for build time
// IMPORTANT: Empty string is treated as "not set", so we use || instead of ??
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvxrgbntiksskywsroax.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHJnYm50aWtzc2t5d3Nyb2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDU3MTIsImV4cCI6MjA4NjQyMTcxMn0.xM7u06mRQSCKCoNQwYa2_wEw4he4ZM11iDfyhjfQtDc';

// Lazy-initialized Supabase client
let _supabaseClient: SupabaseClient | null = null;

/**
 * Get the Supabase client (lazy initialization)
 * Creates the client on first call, not at module load time
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    // Use the constant values (already have fallbacks)
    // Note: Supabase JS client v2 handles SSR automatically
    // Do not manually set storage - let Supabase use its default adaptive storage
    _supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _supabaseClient;
}

/**
 * Supabase client proxy for backward compatibility
 *
 * This proxy defers client creation until first property access.
 * Safe to import at module level - no client is created until actually used.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

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
let _sessionPromise: ReturnType<SupabaseClient['auth']['getSession']> | null = null;

export function getSessionSafe() {
  if (_sessionPromise) {
    return _sessionPromise;
  }
  const client = getSupabaseClient();
  _sessionPromise = client.auth.getSession().finally(() => {
    _sessionPromise = null;
  });
  return _sessionPromise;
}

export async function getAccessTokenSafe(): Promise<string | null> {
  try {
    const { data: { session }, error } = await getSessionSafe();
    if (error) {
      console.error('[getAccessTokenSafe] Session error:', error);
      return null;
    }
    if (!session) {
      console.log('[getAccessTokenSafe] No session found');
      return null;
    }
    return session.access_token || null;
  } catch (err) {
    console.error('[getAccessTokenSafe] Error:', err);
    return null;
  }
}