/**
 * Supabase Admin Client
 *
 * Creates a Supabase client that uses service role key if available,
 * otherwise falls back to anon key for local development.
 *
 * Note: When using anon key, RLS policies apply and some operations
 * may be restricted. For full admin access, ensure SUPABASE_SERVICE_ROLE_KEY
 * is configured in your environment.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default placeholder values for build time
const DEFAULT_SUPABASE_URL = 'https://tvxrgbntiksskywsroax.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHJnYm50aWtzc2t5d3Nyb2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDU3MTIsImV4cCI6MjA4NjQyMTcxMn0.xM7u06mRQSCKCoNQwYa2_wEw4he4ZM11iDfyhjfQtDc';

/**
 * Check if service role key is available
 * Reads from process.env at call time to ensure runtime availability
 */
export function hasServiceRoleKey(): boolean {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!serviceRoleKey && serviceRoleKey.length > 0;
}

/**
 * Create a Supabase client with the best available key
 * - Uses service role key if available (bypasses RLS)
 * - Falls back to anon key for local development (RLS applies)
 * - Falls back to default values if no env vars are set (for build time)
 *
 * Reads environment variables at call time to ensure they're available.
 */
export function createSupabaseAdmin(): SupabaseClient {
  // Try to get values from environment, fall back to defaults
  // Use || instead of ?? to treat empty strings as "not set"
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  // Prefer service role key for admin operations, fall back to anon key
  const key = serviceRoleKey || anonKey;

  // At this point, we should always have valid url and key (either from env or defaults)
  return createClient(url, key);
}

/**
 * Singleton instance for reuse
 */
let _adminClient: SupabaseClient | null = null;

/**
 * Get or create the admin client singleton
 *
 * Returns a lazy proxy that defers client creation until first property access.
 * This makes it safe to call at module load time during build.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    // Create a lazy proxy that initializes on first use
    _adminClient = new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        // Initialize the real client on first access
        const realClient = createSupabaseAdmin();
        // Replace the proxy with the real client for subsequent accesses
        _adminClient = realClient;
        // Return the property from the real client
        const value = (realClient as any)[prop];
        // Bind methods to the real client
        if (typeof value === 'function') {
          return value.bind(realClient);
        }
        return value;
      }
    });
  }
  return _adminClient;
}

export default getSupabaseAdmin;