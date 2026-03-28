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

// Server-side client for API routes
export async function createServerClient() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}