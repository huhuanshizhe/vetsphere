import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { getAdminUserById } from '@/lib/user-directory';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const siteCode = searchParams.get('site_code');

    const result = await getAdminUserById(
      id,
      siteCode === 'cn' || siteCode === 'intl' ? siteCode : undefined,
    );

    if (!result.item) {
      return NextResponse.json({ error: '用户不存在或已被删除' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/v1/admin/users/[id] error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}