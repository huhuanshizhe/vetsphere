import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { listAdminVerificationWorkbench } from '@/lib/admin-verification-workbench';

/**
 * GET /api/v1/admin/verifications
 * 原始医生认证申请工作台（跨站点）
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const siteCode = searchParams.get('site_code') || 'global';
    const status = searchParams.get('status');
    const verificationType = searchParams.get('type');
    const integrity = searchParams.get('integrity');
    const keyword = (searchParams.get('keyword') || '').trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await listAdminVerificationWorkbench({
      siteCode: siteCode === 'cn' || siteCode === 'intl' ? siteCode : 'global',
      status,
      verificationType,
      keyword,
      integrity:
        integrity === 'healthy'
        || integrity === 'anomalies'
        || integrity === 'missing_directory_user'
        || integrity === 'latest_status_not_approved'
        || integrity === 'historical_approved_superseded'
          ? integrity
          : 'all',
      page,
      pageSize,
    });

    return NextResponse.json({
      ...result,
      totalPages: Math.ceil((result.total || 0) / pageSize),
    });
  } catch (err) {
    console.error('GET /api/v1/admin/verifications error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
