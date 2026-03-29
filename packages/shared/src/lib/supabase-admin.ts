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
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Check if service role key is available
 */
export function hasServiceRoleKey(): boolean {
  return !!SERVICE_ROLE_KEY && SERVICE_ROLE_KEY.length > 0;
}

/**
 * Create a Supabase client with the best available key
 * - Uses service role key if available (bypasses RLS)
 * - Falls back to anon key for local development (RLS applies)
 */
export function createSupabaseAdmin() {
  const key = SERVICE_ROLE_KEY || ANON_KEY;
  
  if (!key) {
    throw new Error('No Supabase key available. Set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  return createClient(SUPABASE_URL, key);
}

/**
 * Singleton instance for reuse
 */
let _adminClient: ReturnType<typeof createClient> | null = null;

/**
 * Get or create the admin client singleton
 */
export function getSupabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createSupabaseAdmin();
  }
  return _adminClient;
}

export default getSupabaseAdmin;