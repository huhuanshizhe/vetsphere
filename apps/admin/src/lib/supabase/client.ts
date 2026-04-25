// 复用 packages/shared 的全局 supabase 单例，避免 admin 应用同时初始化
// 两个 SupabaseClient 共用同一个 storage key（sb-*-auth-token）抢 Web Lock，
// 导致 getSession() / 鉴权请求出现 "Lock was released because another request stole it"。
import { getSupabaseClient, getAccessTokenSafe } from '@vetsphere/shared/services/supabase';

export function createClient() {
  return getSupabaseClient();
}

export async function getAccessTokenLocal(): Promise<string | null> {
  return getAccessTokenSafe();
}

