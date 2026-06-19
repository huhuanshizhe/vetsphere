/**
 * Intl站点的API客户端封装
 * 用于匿名访客的API调用(无需认证)
 */

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
  parseJson?: boolean;
}

function extractErrorMessage(value: unknown, seen = new Set<unknown>()): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (value instanceof ApiError) {
    return extractErrorMessage(value.data, seen) || extractErrorMessage(value.message, seen);
  }

  if (value instanceof Error) {
    return extractErrorMessage(value.message, seen) || value.name;
  }

  if (typeof value !== 'object') {
    return null;
  }

  if (seen.has(value)) {
    return null;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractErrorMessage(item, seen);
      if (message) return message;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ['error', 'message', 'details', 'detail', 'hint', 'msg', 'error_description']) {
    if (!(key in record)) continue;
    const message = extractErrorMessage(record[key], seen);
    if (message) return message;
  }

  if (Array.isArray(record.errors)) {
    const message = extractErrorMessage(record.errors, seen);
    if (message) return message;
  }

  return null;
}

/**
 * 统一的intl端fetch封装:
 * - 自动JSON content-type
 * - 4xx/5xx抛出ApiError
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { parseJson = true, headers, body, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (body && !(body instanceof FormData) && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
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
    const message = extractErrorMessage(data) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  if (!parseJson || res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

/** 提取错误对象的可读消息 */
export function getErrorMessage(err: unknown): string {
  return extractErrorMessage(err) || 'Unknown error';
}
