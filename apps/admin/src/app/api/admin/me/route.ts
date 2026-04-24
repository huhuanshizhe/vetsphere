import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/me
 *
 * 返回当前登录管理员的基本信息和被授权的站点列表。
 * 前端用于：
 *  - 替代依赖 supabase.user_metadata.role 的脆弱判断
 *  - 给 SiteContext 提供"被授权站点"白名单
 */
export const GET = withAdminAuth(async (_req, { admin }) => {
  return NextResponse.json({
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    role: admin.role,
    adminRoleId: admin.adminRoleId,
    authorizedSites: admin.authorizedSites,
  });
});
