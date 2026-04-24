import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * 服务端专用 Supabase Admin Client（使用 SERVICE_ROLE_KEY）
 *
 * - 只能在 API Route / Server Component 中使用，绝对禁止暴露到浏览器
 * - 集中创建，便于全局复用与监控
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: SupabaseClient<any, 'public', any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(): SupabaseClient<any, 'public', any> {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      '[supabaseAdmin] 缺少环境变量 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _adminClient = createSupabaseClient<any>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
