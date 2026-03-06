import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: SupabaseClient<any, 'public', any> | null = null;

export function createClient() {
  if (client) return client;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client = createSupabaseClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return client;
}

// Deduplication wrapper for getSession() - prevents Web Locks contention
let _localSessionPromise: ReturnType<SupabaseClient['auth']['getSession']> | null = null;

export async function getAccessTokenLocal(): Promise<string | null> {
  const supabase = createClient();
  if (_localSessionPromise) {
    const { data: { session } } = await _localSessionPromise;
    return session?.access_token || null;
  }
  _localSessionPromise = supabase.auth.getSession().finally(() => {
    _localSessionPromise = null;
  });
  const { data: { session } } = await _localSessionPromise;
  return session?.access_token || null;
}
