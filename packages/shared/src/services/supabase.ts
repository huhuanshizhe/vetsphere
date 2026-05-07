import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use environment variables with fallbacks for build time
// IMPORTANT: Empty string is treated as "not set", so we use || instead of ??
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvxrgbntiksskywsroax.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHJnYm50aWtzc2t5d3Nyb2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDU3MTIsImV4cCI6MjA4NjQyMTcxMn0.xM7u06mRQSCKCoNQwYa2_wEw4he4ZM11iDfyhjfQtDc';

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
        // Disable Web Locks API. supabase-js 默认用 navigator.locks 做 token
        // 刷新互斥, 但在 Next.js dev (HMR / Strict Mode / 多个 client 实例) 下
        // 偶发 "Lock was released because another request stole it" 死锁,
        // 导致 .from(...).select(...) 这类 PostgREST 调用永久 pending,
        // 表现为 admin 各列表页 "加载中..." 转圈不消失。
        // 用 no-op lock 直接放行 (单标签场景无竞态, 跨标签虽可能短暂冲突
        // 但不会卡死页面, 取舍之下选可用性)。
        lock: async (_name, _acquireTimeout, fn) => fn(),
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
  },
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

/**
 * 直接从 localStorage 读取 supabase 缓存的 access_token，绕过
 * `supabase.auth.getSession()` 在 Next.js dev 环境下偶发的 Web Lock
 * "Lock was released because another request stole it" 死锁。
 * 仅在浏览器环境可用。
 */
export const SESSION_TOKEN_KEY = 'vetsphere_access_token';

function readAccessTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // 优先读自定义 sessionStorage key（规避 Supabase SDK Web Lock 超时问题）
    const direct = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (direct) return direct;
  } catch {
    /* ignore */
  }
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.includes('-auth-token')) continue;
      const raw = window.localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const token = parsed?.access_token;
        if (typeof token === 'string' && token.length > 0) return token;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function getAccessTokenSafe(): Promise<string | null> {
  // 优先走 localStorage 同步快路径，规避 Web Lock 死锁导致的页面"一直加载中"
  const fast = readAccessTokenFromStorage();
  if (fast) return fast;

  // 回退到 SDK，叠加 1.5s 超时兜底，避免 getSession() 永远 pending
  try {
    const result = await Promise.race<Awaited<ReturnType<typeof getSessionSafe>> | null>([
      getSessionSafe(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    if (!result) {
      console.warn('[getAccessTokenSafe] getSession timed out (1.5s)');
      return null;
    }
    const {
      data: { session },
      error,
    } = result;
    if (error) {
      console.error('[getAccessTokenSafe] Session error:', error);
      return null;
    }
    if (!session) {
      return null;
    }
    return session.access_token || null;
  } catch (err) {
    console.error('[getAccessTokenSafe] Error:', err);
    return null;
  }
}
