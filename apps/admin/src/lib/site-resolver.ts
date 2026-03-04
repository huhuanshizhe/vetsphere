import { NextRequest } from 'next/server';

export type SiteCode = 'cn' | 'intl';

const VALID_SITES: SiteCode[] = ['cn', 'intl'];

/**
 * 从请求中解析 site_code 参数（可选）
 */
export function parseSiteCode(req: NextRequest): SiteCode | null {
  const code = req.nextUrl.searchParams.get('site_code');
  if (!code) return null;
  if (!VALID_SITES.includes(code as SiteCode)) return null;
  return code as SiteCode;
}

/**
 * 从请求中要求 site_code（必须存在）
 */
export function requireSiteCode(req: NextRequest): SiteCode {
  const code = parseSiteCode(req);
  if (!code) {
    throw new SiteCodeError('Missing or invalid site_code parameter. Must be "cn" or "intl".');
  }
  return code;
}

/**
 * 校验 site_code 值
 */
export function assertValidSiteCode(code: string): asserts code is SiteCode {
  if (!VALID_SITES.includes(code as SiteCode)) {
    throw new SiteCodeError(`Invalid site_code: "${code}". Must be "cn" or "intl".`);
  }
}

/**
 * 解析 view 参数（base / site）
 */
export function parseViewMode(req: NextRequest): 'base' | 'site' {
  const view = req.nextUrl.searchParams.get('view');
  if (view === 'site') return 'site';
  return 'base';
}

export class SiteCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiteCodeError';
  }
}

/**
 * 统一错误响应
 */
export function siteCodeErrorResponse(error: unknown) {
  if (error instanceof SiteCodeError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  throw error;
}
