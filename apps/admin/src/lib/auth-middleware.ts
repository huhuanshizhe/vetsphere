import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from './supabase/admin';

export interface AdminProfile {
  id: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
  adminRoleId: string | null;
  /** 角色 code（admin_roles.code）。用于前端展示与判超管 */
  roleCode: string | null;
  /** 兼容字段：旧库使用 profiles.role = 'Admin' */
  role: string | null;
  /** 该管理员被授权访问的站点（cn / intl / global） */
  authorizedSites: string[];
  /**
   * 权限码列表（如 ['user.view','doctor_verify.approve']）。
   * super_admin / 旧 is_admin 用户返回 ['*']（全权限）。
   */
  permissions: string[];
}

export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = 'AdminAuthError';
    this.status = status;
  }
}

/**
 * 从请求头解析 Bearer token
 */
function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return null;
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * 通过 supabase admin client 验证 token + 检查管理员身份
 *
 * 兼容三种历史角色定义：
 *   1. profiles.admin_role_id 非空（新方案，推荐）
 *   2. profiles.is_admin = true
 *   3. profiles.role = 'Admin'（旧字段）
 *
 * 任意一种成立即视为管理员。
 */
export async function authenticateAdmin(req: NextRequest): Promise<AdminProfile> {
  const token = extractBearerToken(req);
  if (!token) {
    throw new AdminAuthError('未提供登录凭证', 401);
  }

  const supabase = getSupabaseAdmin();

  // 1. 验证 token 合法性 → 拿到 user
  const { data: userResult, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userResult?.user) {
    throw new AdminAuthError('登录已失效，请重新登录', 401);
  }
  const user = userResult.user;

  // 2. 查 profiles，确认是管理员
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_admin, admin_role_id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr) {
    throw new AdminAuthError('权限校验失败', 403);
  }
  if (!profile) {
    throw new AdminAuthError('用户档案不存在', 403);
  }

  const isAdmin =
    profile.is_admin === true ||
    profile.admin_role_id != null ||
    (typeof profile.role === 'string' && profile.role.toLowerCase() === 'admin');

  if (!isAdmin) {
    throw new AdminAuthError('权限不足：仅限系统管理员访问', 403);
  }

  // 3. 确定授权站点（暂时全部授权，后续可基于 admin_role_id 细化）
  // 未来可在 admin_roles 表加 authorized_sites jsonb 字段
  const authorizedSites = ['cn', 'intl', 'global'];

  // 4. 解析角色 code + 权限列表（RBAC）
  let roleCode: string | null = null;
  let permissions: string[] = [];

  if (profile.admin_role_id) {
    const { data: roleRow } = await supabase
      .from('admin_roles')
      .select('code')
      .eq('id', profile.admin_role_id)
      .maybeSingle();
    roleCode = roleRow?.code ?? null;

    if (roleCode === 'super_admin') {
      permissions = ['*'];
    } else {
      const { data: rps } = await supabase
        .from('role_permissions')
        .select('permission:permissions(code)')
        .eq('role_id', profile.admin_role_id);
      permissions = (rps || [])
        .map((r: { permission: { code: string } | { code: string }[] | null }) => {
          const p = r.permission;
          if (!p) return null;
          if (Array.isArray(p)) return p[0]?.code ?? null;
          return p.code;
        })
        .filter((c): c is string => !!c);
    }
  } else {
    // 兼容：旧 is_admin / role='Admin' 用户视为超管
    permissions = ['*'];
    roleCode = 'super_admin';
  }

  return {
    id: profile.id,
    email: profile.email ?? user.email ?? '',
    fullName: profile.full_name ?? null,
    isAdmin: true,
    adminRoleId: profile.admin_role_id ?? null,
    roleCode,
    role: profile.role ?? null,
    authorizedSites,
    permissions,
  };
}

/**
 * 包装 API Route handler，自动校验管理员身份并注入 admin profile。
 *
 * 用法：
 * ```ts
 * export const GET = withAdminAuth(async (req, { admin }) => {
 *   // admin.id, admin.authorizedSites ...
 *   return NextResponse.json({ ... });
 * });
 * ```
 */
export type AdminRouteContext<TParams = Record<string, string>> = {
  admin: AdminProfile;
  params?: TParams;
};

export function withAdminAuth<TParams = Record<string, string>>(
  handler: (
    req: NextRequest,
    ctx: AdminRouteContext<TParams>
  ) => Promise<NextResponse> | NextResponse
) {
  return async (
    req: NextRequest,
    routeCtx?: { params?: TParams | Promise<TParams> }
  ): Promise<NextResponse> => {
    try {
      const admin = await authenticateAdmin(req);
      const params = routeCtx?.params ? await Promise.resolve(routeCtx.params) : undefined;
      return await handler(req, { admin, params });
    } catch (err) {
      if (err instanceof AdminAuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error('[withAdminAuth] 未捕获异常:', err);
      return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
    }
  };
}

/**
 * 仅校验，不包装 handler。适用于已有复杂逻辑、希望手工接入的路由。
 * 失败时返回 NextResponse；成功时返回 admin profile。
 */
export async function requireAdmin(
  req: NextRequest
): Promise<{ admin: AdminProfile } | { response: NextResponse }> {
  try {
    const admin = await authenticateAdmin(req);
    return { admin };
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return { response: NextResponse.json({ error: err.message }, { status: err.status }) };
    }
    console.error('[requireAdmin] 未捕获异常:', err);
    return { response: NextResponse.json({ error: '服务器内部错误' }, { status: 500 }) };
  }
}

/**
 * 检查站点是否在 admin 授权范围内。不在则抛 403。
 */
export function assertSiteAuthorized(admin: AdminProfile, site: string): void {
  if (!admin.authorizedSites.includes(site)) {
    throw new AdminAuthError(`无权访问站点：${site}`, 403);
  }
}

/**
 * 判断 admin 是否拥有指定权限码。
 * - permissions 包含 '*' → 全权限通过
 * - 否则需要精确包含 code
 */
export function adminHasPermission(admin: AdminProfile, code: string): boolean {
  if (!admin.permissions || admin.permissions.length === 0) return false;
  if (admin.permissions.includes('*')) return true;
  return admin.permissions.includes(code);
}

/**
 * 同时校验「是管理员」+「拥有指定权限码」。
 * 失败时返回 NextResponse；成功时返回 admin profile。
 */
export async function requirePermission(
  req: NextRequest,
  code: string
): Promise<{ admin: AdminProfile } | { response: NextResponse }> {
  const result = await requireAdmin(req);
  if ('response' in result) return result;
  if (!adminHasPermission(result.admin, code)) {
    return {
      response: NextResponse.json(
        { error: `权限不足：缺少 ${code}` },
        { status: 403 }
      ),
    };
  }
  return result;
}
