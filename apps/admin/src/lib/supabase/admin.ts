import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://tvxrgbntiksskywsroax.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHJnYm50aWtzc2t5d3Nyb2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDU3MTIsImV4cCI6MjA4NjQyMTcxMn0.xM7u06mRQSCKCoNQwYa2_wEw4he4ZM11iDfyhjfQtDc';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: SupabaseClient<any, 'public', any> | null = null;
let _warnedMissingServiceRole = false;

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
}

export function hasSupabaseServiceRoleKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createAdminClient(accessToken?: string): SupabaseClient<any, 'public', any> {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = getSupabaseAnonKey();

  if (!serviceKey && !_warnedMissingServiceRole) {
    _warnedMissingServiceRole = true;
    console.warn(
      '[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY 未配置，当前回退到 anon key。本地开发可继续运行，但部分受 RLS 限制的写操作可能失败。'
    );
  }

  return createSupabaseClient<any>(url, serviceKey || anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(accessToken?: string): SupabaseClient<any, 'public', any> {
  if (accessToken) {
    return createAdminClient(accessToken);
  }

  if (!_adminClient) {
    _adminClient = new Proxy({} as SupabaseClient<any, 'public', any>, {
      get(_target, prop) {
        const realClient = createAdminClient();
        _adminClient = realClient;
        const value = (realClient as any)[prop];
        return typeof value === 'function' ? value.bind(realClient) : value;
      },
    });
  }

  return _adminClient;
}
