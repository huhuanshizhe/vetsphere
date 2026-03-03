/**
 * Admin 后台导航配置
 * 15个一级模块，42个页面
 */

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  href?: string;
  permission?: string;
  children?: NavItem[];
  badge?: 'new' | 'beta' | number;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

// 完整的后台导航配置
export const ADMIN_NAVIGATION: NavGroup[] = [
  {
    key: 'main',
    label: '主要',
    items: [
      {
        key: 'dashboard',
        label: '控制台',
        icon: '📊',
        href: '/dashboard',
        permission: 'dashboard.view',
      },
    ],
  },
  {
    key: 'users',
    label: '用户与权限',
    items: [
      {
        key: 'admin-users',
        label: '管理员列表',
        icon: '👤',
        href: '/users',
        permission: 'user.view',
      },
      {
        key: 'roles',
        label: '角色管理',
        icon: '🔑',
        href: '/roles',
        permission: 'role.view',
      },
      {
        key: 'permissions',
        label: '权限点',
        icon: '🛡️',
        href: '/permissions',
        permission: 'role.view',
      },
    ],
  },
  {
    key: 'doctor-verify',
    label: '医生审核',
    items: [
      {
        key: 'doctor-verifications',
        label: '审核列表',
        icon: '🩺',
        href: '/doctor-verifications',
        permission: 'doctor_verify.view',
      },
    ],
  },
  {
    key: 'cms',
    label: '内容管理',
    items: [
      {
        key: 'cms-pages',
        label: '页面管理',
        icon: '📄',
        href: '/cms/pages',
        permission: 'cms.view',
      },
      {
        key: 'cms-navigation',
        label: '导航配置',
        icon: '🧭',
        href: '/cms/navigation',
        permission: 'cms.view',
      },
    ],
  },
  {
    key: 'growth',
    label: '成长体系',
    items: [
      {
        key: 'growth-tracks',
        label: '成长方向',
        icon: '🌱',
        href: '/growth-tracks',
        permission: 'growth.view',
      },
    ],
  },
  {
    key: 'courses',
    label: '课程管理',
    items: [
      {
        key: 'courses-list',
        label: '课程列表',
        icon: '📚',
        href: '/courses',
        permission: 'course.view',
      },
      {
        key: 'instructors',
        label: '讲师管理',
        icon: '🎓',
        href: '/instructors',
        permission: 'course.view',
      },
      {
        key: 'course-dictionaries',
        label: '筛选字典',
        icon: '📖',
        href: '/courses/dictionaries',
        permission: 'course.view',
      },
    ],
  },
  {
    key: 'shop',
    label: '商城商品',
    items: [
      {
        key: 'products-list',
        label: '商品列表',
        icon: '📦',
        href: '/products',
        permission: 'product.view',
      },
      {
        key: 'shop-scenes',
        label: '采购场景',
        icon: '🏷️',
        href: '/shop/scenes',
        permission: 'product.view',
      },
      {
        key: 'course-product-linking',
        label: '课程-商品关联',
        icon: '🔗',
        href: '/course-product-linking',
        permission: 'product.view',
      },
    ],
  },
  {
    key: 'leads',
    label: '采购线索',
    items: [
      {
        key: 'purchase-leads',
        label: '线索列表',
        icon: '📋',
        href: '/purchase-leads',
        permission: 'lead.view',
      },
    ],
  },
  {
    key: 'doctor-business',
    label: '医生端业务',
    items: [
      {
        key: 'doctors',
        label: '医生列表',
        icon: '👨‍⚕️',
        href: '/doctors',
        permission: 'doctor_verify.view',
      },
      {
        key: 'doctor-clients',
        label: '客户数据',
        icon: '👥',
        href: '/doctor-business/clients',
        permission: 'doctor_verify.view',
      },
      {
        key: 'doctor-records',
        label: '病历数据',
        icon: '📝',
        href: '/doctor-business/records',
        permission: 'doctor_verify.view',
      },
      {
        key: 'doctor-consultations',
        label: '问诊数据',
        icon: '💬',
        href: '/doctor-business/consultations',
        permission: 'doctor_verify.view',
      },
    ],
  },
  {
    key: 'community',
    label: '社区管理',
    items: [
      {
        key: 'community-posts',
        label: '帖子列表',
        icon: '📰',
        href: '/community/posts',
        permission: 'community.view',
      },
      {
        key: 'community-comments',
        label: '评论列表',
        icon: '💭',
        href: '/community/comments',
        permission: 'community.view',
      },
    ],
  },
  {
    key: 'ai',
    label: 'AI 配置',
    items: [
      {
        key: 'ai-features',
        label: '功能开关',
        icon: '🤖',
        href: '/ai/features',
        permission: 'ai.view',
      },
      {
        key: 'ai-tasks',
        label: '任务模板',
        icon: '📋',
        href: '/ai/tasks',
        permission: 'ai.view',
      },
      {
        key: 'ai-logs',
        label: '使用记录',
        icon: '📊',
        href: '/ai/logs',
        permission: 'ai.view',
      },
    ],
  },
  {
    key: 'routes',
    label: '路由与占位',
    items: [
      {
        key: 'route-registry',
        label: '路由注册表',
        icon: '🗺️',
        href: '/routes',
        permission: 'route.view',
      },
      {
        key: 'coming-soon',
        label: '占位模板',
        icon: '🚧',
        href: '/coming-soon-templates',
        permission: 'route.view',
      },
    ],
  },
  {
    key: 'notifications',
    label: '通知消息',
    items: [
      {
        key: 'notification-templates',
        label: '通知模板',
        icon: '🔔',
        href: '/notifications',
        permission: 'system.view',
      },
    ],
  },
  {
    key: 'system',
    label: '系统设置',
    items: [
      {
        key: 'dictionaries',
        label: '字典配置',
        icon: '📖',
        href: '/system/dictionaries',
        permission: 'system.view',
      },
      {
        key: 'configs',
        label: '系统配置',
        icon: '⚙️',
        href: '/system/configs',
        permission: 'system.edit',
      },
    ],
  },
  {
    key: 'data',
    label: '数据与日志',
    items: [
      {
        key: 'analytics',
        label: '数据统计',
        icon: '📈',
        href: '/analytics',
        permission: 'system.view',
      },
      {
        key: 'operation-logs',
        label: '操作日志',
        icon: '📜',
        href: '/operation-logs',
        permission: 'system.view',
      },
    ],
  },
];

// 扁平化的菜单项，用于路由匹配
export const FLAT_NAV_ITEMS = ADMIN_NAVIGATION.flatMap(group => 
  group.items.flatMap(item => 
    item.children ? [item, ...item.children] : [item]
  )
);

// 获取面包屑路径
export function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const breadcrumbs: { label: string; href: string }[] = [
    { label: '控制台', href: '/dashboard' }
  ];
  
  for (const group of ADMIN_NAVIGATION) {
    for (const item of group.items) {
      if (item.href && pathname.startsWith(item.href)) {
        if (item.href !== '/dashboard') {
          breadcrumbs.push({ label: item.label, href: item.href });
        }
      }
      if (item.children) {
        for (const child of item.children) {
          if (child.href && pathname.startsWith(child.href)) {
            breadcrumbs.push({ label: item.label, href: item.href || '#' });
            breadcrumbs.push({ label: child.label, href: child.href });
          }
        }
      }
    }
  }
  
  return breadcrumbs;
}

// P0 核心页面列表
export const P0_PAGES = [
  '/dashboard',
  '/doctor-verifications',
  '/cms/pages',
  '/growth-tracks',
  '/courses',
  '/products',
  '/routes',
  '/coming-soon-templates',
  '/system/dictionaries',
];

// P1 页面列表
export const P1_PAGES = [
  '/users',
  '/roles',
  '/cms/navigation',
  '/instructors',
  '/courses/dictionaries',
  '/shop/scenes',
  '/purchase-leads',
  '/doctors',
  '/notifications',
  '/ai/features',
];
