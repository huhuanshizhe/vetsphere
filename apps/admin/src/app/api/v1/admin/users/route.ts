import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { listAdminUsers } from '@/lib/user-directory';

/**
 * GET /api/v1/admin/users
 *
 * 统一用户目录列表。
 *
 * Query:
 *   site_code = cn | intl | global   (默认 global)
 *   keyword = 搜索姓名 / 邮箱 / 手机号
 *   verification_status = approved | submitted | under_review | rejected | none
 *   page, pageSize
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const siteCode = searchParams.get('site_code') || 'global';
    const keyword = (searchParams.get('keyword') || '').trim();
    const verificationStatus = searchParams.get('verification_status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const result = await listAdminUsers({
      siteCode: siteCode === 'cn' || siteCode === 'intl' ? siteCode : 'global',
      keyword,
      verificationStatus,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/v1/admin/users error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
