/**
 * Admin 权限检查工具
 */

import { createClient } from '@supabase/supabase-js';

// 权限模块定义
export const PERMISSION_MODULES = {
  dashboard: '控制台',
  user: '用户管理',
  role: '角色管理',
  doctor_verify: '医生审核',
  cms: '内容管理',
  growth: '成长体系',
  course: '课程管理',
  product: '商品管理',
  lead: '采购线索',
  community: '社区管理',
  ai: 'AI配置',
  route: '路由管理',
  system: '系统设置',
} as const;

// 权限动作定义
export const PERMISSION_ACTIONS = {
  view: '查看',
  create: '创建',
  edit: '编辑',
  delete: '删除',
  publish: '发布',
  offline: '下线',
  approve: '审核通过',
  reject: '审核拒绝',
  assign: '分配',
  moderate: '内容审核',
} as const;

export type PermissionModule = keyof typeof PERMISSION_MODULES;
export type PermissionAction = keyof typeof PERMISSION_ACTIONS;

/**
 * 检查用户是否有指定权限
 */
export function hasPermission(
  userPermissions: string[] | undefined,
  requiredPermission: string
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  
  // 超级管理员拥有所有权限
  if (userPermissions.includes('*')) {
    return true;
  }
  
  return userPermissions.includes(requiredPermission);
}

/**
 * 检查用户是否有任一指定权限
 */
export function hasAnyPermission(
  userPermissions: string[] | undefined,
  requiredPermissions: string[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  
  if (userPermissions.includes('*')) {
    return true;
  }
  
  return requiredPermissions.some(p => userPermissions.includes(p));
}

/**
 * 检查用户是否有所有指定权限
 */
export function hasAllPermissions(
  userPermissions: string[] | undefined,
  requiredPermissions: string[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  
  if (userPermissions.includes('*')) {
    return true;
  }
  
  return requiredPermissions.every(p => userPermissions.includes(p));
}

/**
 * 构建权限代码
 */
export function buildPermissionCode(
  module: PermissionModule,
  action: PermissionAction
): string {
  return `${module}.${action}`;
}

/**
 * 解析权限代码
 */
export function parsePermissionCode(code: string): {
  module: string;
  action: string;
} | null {
  const parts = code.split('.');
  if (parts.length !== 2) {
    return null;
  }
  return {
    module: parts[0],
    action: parts[1],
  };
}

/**
 * 获取用户权限列表（从数据库）
 */
export async function getUserPermissions(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string[]> {
  try {
    // 获取用户的角色
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('admin_role_id, is_admin')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile?.is_admin || !profile?.admin_role_id) {
      return [];
    }
    
    // 检查是否是超级管理员
    const { data: role, error: roleError } = await supabase
      .from('admin_roles')
      .select('code')
      .eq('id', profile.admin_role_id)
      .single();
    
    if (roleError) {
      return [];
    }
    
    // 超级管理员返回通配符
    if (role.code === 'super_admin') {
      return ['*'];
    }
    
    // 获取角色的权限
    const { data: rolePermissions, error: rpError } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          code
        )
      `)
      .eq('role_id', profile.admin_role_id);
    
    if (rpError || !rolePermissions) {
      return [];
    }
    
    return rolePermissions
      .map((rp: any) => rp.permissions?.code)
      .filter(Boolean) as string[];
  } catch (error) {
    console.error('Failed to get user permissions:', error);
    return [];
  }
}

/**
 * 页面权限映射
 */
export const PAGE_PERMISSIONS: Record<string, string> = {
  '/dashboard': 'dashboard.view',
  '/users': 'user.view',
  '/roles': 'role.view',
  '/permissions': 'role.view',
  '/doctor-verifications': 'doctor_verify.view',
  '/cms/pages': 'cms.view',
  '/cms/navigation': 'cms.view',
  '/growth-tracks': 'growth.view',
  '/courses': 'course.view',
  '/courses/dictionaries': 'course.view',
  '/instructors': 'course.view',
  '/products': 'product.view',
  '/shop/scenes': 'product.view',
  '/course-product-linking': 'product.view',
  '/purchase-leads': 'lead.view',
  '/doctors': 'doctor_verify.view',
  '/doctor-business/clients': 'doctor_verify.view',
  '/doctor-business/records': 'doctor_verify.view',
  '/doctor-business/consultations': 'doctor_verify.view',
  '/community/posts': 'community.view',
  '/community/comments': 'community.view',
  '/ai/features': 'ai.view',
  '/ai/tasks': 'ai.view',
  '/ai/logs': 'ai.view',
  '/routes': 'route.view',
  '/coming-soon-templates': 'route.view',
  '/notifications': 'system.view',
  '/system/dictionaries': 'system.view',
  '/system/configs': 'system.edit',
  '/analytics': 'system.view',
  '/operation-logs': 'system.view',
};

/**
 * 检查路径是否需要特定权限
 */
export function getRequiredPermission(pathname: string): string | null {
  // 精确匹配
  if (PAGE_PERMISSIONS[pathname]) {
    return PAGE_PERMISSIONS[pathname];
  }
  
  // 前缀匹配（处理动态路由）
  for (const [path, permission] of Object.entries(PAGE_PERMISSIONS)) {
    if (pathname.startsWith(path + '/')) {
      return permission;
    }
  }
  
  return null;
}
