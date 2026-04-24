import { getAccessTokenLocal } from '@/lib/supabase/client';

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface ApiFetchOptions extends RequestInit {
  /** 是否自动注入 Bearer token，默认 true */
  withAuth?: boolean;
  /** 是否解析 JSON，默认 true */
  parseJson?: boolean;
}

/**
 * 统一的 admin 端 fetch 封装：
 * - 自动注入 Authorization Bearer
 * - 自动 JSON content-type
 * - 401/403/4xx/5xx 抛出 `ApiError`
 * - 默认 cache: 'no-store'
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { withAuth = true, parseJson = true, headers, body, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (body && !(body instanceof FormData) && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (withAuth) {
    const token = await getAccessTokenLocal();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    cache: 'no-store',
    ...rest,
    headers: finalHeaders,
    body,
  });

  if (!res.ok) {
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // ignore
    }
    const message =
      (data as { error?: string; message?: string } | null)?.error ||
      (data as { error?: string; message?: string } | null)?.message ||
      `请求失败 (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  if (!parseJson || res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

/** 提取错误对象的可读消息 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return '未知错误';
}
