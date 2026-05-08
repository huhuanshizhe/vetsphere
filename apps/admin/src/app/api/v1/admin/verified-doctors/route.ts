import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { listVerifiedDoctors } from '@/lib/user-directory';

/**
 * GET /api/v1/admin/verified-doctors
 *
 * 已认证医生名册：只展示统一用户目录中、最新认证状态仍为 approved 的真实用户。
 * Query: site_code, type, keyword, page, pageSize
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const siteCode = searchParams.get('site_code') || 'global';
    const verificationType = searchParams.get('type');
    const keyword = (searchParams.get('keyword') || '').trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await listVerifiedDoctors({
      siteCode: siteCode === 'cn' || siteCode === 'intl' ? siteCode : 'global',
      keyword,
      verificationType,
      page,
      pageSize,
    });

    return NextResponse.json({
      items: result.items.map((item) => ({
        verificationId: item.verificationRequestId,
        userId: item.userId,
        siteCode: item.siteCode,
        sourceSite: item.sourceSite,
        contact: item.contact,
        email: item.email,
        displayName: item.displayName,
        fullName: item.fullName,
        realName: item.verificationRealName || item.fullName || item.displayName,
        organizationName: item.verificationOrganizationName,
        positionTitle: item.verificationPositionTitle,
        verificationType: item.verificationType,
        approvedLevel: item.verificationApprovedLevel,
        reviewedAt: item.verificationReviewedAt,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      siteCode: result.siteCode,
      source: result.source,
    });
  } catch (err) {
    console.error('GET /api/v1/admin/verified-doctors error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
