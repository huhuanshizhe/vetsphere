/**
 * Admin 后台导航配置
 * 8 大核心模块，现代化平台运营中枢架构
 */

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  href?: string;
  permission?: string;
  children?: NavItem[];
  badge?: 'new' | 'beta' | number;
  siteScope?: 'cn' | 'intl' | 'global' | 'all';
}

export interface NavGroup {
  key: string;
  label: string;
  icon: string; // 分组图标，用于折叠态显示
  items: NavItem[];
  siteScope?: 'cn' | 'intl' | 'global' | 'all';
}

// 8 大核心模块导航配置
export const ADMIN_NAVIGATION: NavGroup[] = [
  // ============================================
  // 1. 总览 - Dashboard
  // ============================================
  {
    key: 'overview',
    label: '总览',
    icon: 'LayoutDashboard',
    items: [
      {
        key: 'dashboard',
        label: '运营中枢',
        icon: 'LayoutDashboard',
        href: '/dashboard',
        permission: 'dashboard.view',
      },
      {
        key: 'analytics',
        label: '数据统计',
        icon: 'BarChart3',
        href: '/analytics',
        permission: 'system.view',
      },
    ],
  },

  // ============================================
  // 2. 用户与审核 - 用户管理 + 医生审核 + 医生端业务
  // ============================================
  {
    key: 'users-audit',
    label: '用户与审核',
    icon: 'Users',
    items: [
      {
        key: 'user-list',
        label: '用户列表',
        icon: 'Users',
        href: '/users',
        permission: 'user.view',
      },
      {
        key: 'roles',
        label: '角色权限',
        icon: 'Shield',
        href: '/system/roles',
        permission: 'role.view',
      },
      {
        key: 'doctor-verifications',
        label: '医生审核',
        icon: 'ClipboardCheck',
        href: '/cn-verifications',
        permission: 'doctor_verify.view',
        siteScope: 'cn',
      },
      {
        key: 'doctors',
        label: '医生列表',
        icon: 'Stethoscope',
        href: '/doctors',
        permission: 'doctor_verify.view',
        siteScope: 'cn',
      },
      {
        key: 'doctor-clients',
        label: '客户数据',
        icon: 'Users',
        href: '/doctor-business/clients',
        permission: 'doctor_verify.view',
        siteScope: 'cn',
      },
      {
        key: 'doctor-records',
        label: '病历数据',
        icon: 'FileText',
        href: '/doctor-business/records',
        permission: 'doctor_verify.view',
        siteScope: 'cn',
      },
      {
        key: 'doctor-consultations',
        label: '问诊数据',
        icon: 'MessageSquare',
        href: '/doctor-business/consultations',
        permission: 'doctor_verify.view',
        siteScope: 'cn',
      },
    ],
  },

  // ============================================
  // 3. 课程与成长 - 课程管理 + 成长体系 + 学习中心
  // ============================================
  {
    key: 'courses-growth',
    label: '课程与成长',
    icon: 'GraduationCap',
    items: [
      {
        key: 'courses-list',
        label: '课程列表',
        icon: 'BookOpen',
        href: '/courses',
        permission: 'course.view',
      },
      {
        key: 'course-chapters',
        label: '章节管理',
        icon: 'ListTree',
        href: '/courses/chapters',
        permission: 'course.view',
      },
      {
        key: 'instructors',
        label: '讲师管理',
        icon: 'UserCheck',
        href: '/instructors',
        permission: 'course.view',
      },
      {
        key: 'course-reviews',
        label: '课程评价',
        icon: 'Star',
        href: '/course-reviews',
        permission: 'course.view',
      },
      {
        key: 'course-dictionaries',
        label: '筛选字典',
        icon: 'Tags',
        href: '/courses/dictionaries',
        permission: 'course.view',
      },
      {
        key: 'growth-tracks',
        label: '成长方向',
        icon: 'TrendingUp',
        href: '/growth-tracks',
        permission: 'growth.view',
        siteScope: 'cn',
      },
      {
        key: 'learning-records',
        label: '学习记录',
        icon: 'History',
        href: '/learning',
        permission: 'course.view',
        siteScope: 'cn',
      },
      {
        key: 'interviews',
        label: '面试管理',
        icon: 'Mic',
        href: '/interviews',
        permission: 'course.view',
        siteScope: 'cn',
      },
    ],
  },

  // ============================================
  // 4. 商品与采购 - 商城商品 + 采购线索
  // ============================================
  {
    key: 'products-purchase',
    label: '商品与采购',
    icon: 'Package',
    items: [
      {
        key: 'products-list',
        label: '商品列表',
        icon: 'Package',
        href: '/products',
        permission: 'product.view',
      },
      {
        key: 'shop-scenes',
        label: '采购场景',
        icon: 'ShoppingBag',
        href: '/shop/scenes',
        permission: 'product.view',
      },
      {
        key: 'course-product-linking',
        label: '课程关联',
        icon: 'Link',
        href: '/course-product-linking',
        permission: 'product.view',
      },
      {
        key: 'purchase-leads',
        label: '采购线索',
        icon: 'ClipboardList',
        href: '/leads',
        permission: 'lead.view',
      },
    ],
  },

  // ============================================
  // 5. 内容与社区 - 内容管理 + 社区管理
  // ============================================
  {
    key: 'content-community',
    label: '内容与社区',
    icon: 'FileEdit',
    items: [
      {
        key: 'cms-pages',
        label: '页面管理',
        icon: 'FileText',
        href: '/cms/pages',
        permission: 'cms.view',
      },
      {
        key: 'cms-navigation',
        label: '导航配置',
        icon: 'Navigation',
        href: '/cms/navigation',
        permission: 'cms.view',
      },
      {
        key: 'community-posts',
        label: '社区帖子',
        icon: 'MessageCircle',
        href: '/community/posts',
        permission: 'community.view',
        siteScope: 'cn',
      },
      {
        key: 'community-comments',
        label: '评论管理',
        icon: 'MessagesSquare',
        href: '/community/comments',
        permission: 'community.view',
        siteScope: 'cn',
      },
      {
        key: 'community-reports',
        label: '举报管理',
        icon: 'Flag',
        href: '/community/reports',
        permission: 'community.view',
        siteScope: 'cn',
      },
    ],
  },

  // ============================================
  // 6. 订单与财务 - 订单 + 会员 + 优惠券
  // ============================================
  {
    key: 'orders-finance',
    label: '订单与财务',
    icon: 'Receipt',
    siteScope: 'cn',
    items: [
      {
        key: 'orders',
        label: '订单管理',
        icon: 'Receipt',
        href: '/orders',
        permission: 'order.view',
      },
      {
        key: 'memberships',
        label: '会员管理',
        icon: 'Crown',
        href: '/memberships',
        permission: 'order.view',
      },
      {
        key: 'coupons',
        label: '优惠券',
        icon: 'Ticket',
        href: '/coupons',
        permission: 'order.view',
      },
    ],
  },

  // ============================================
  // 7. 站点与AI - AI配置 + 站点内容 + 国际站
  // ============================================
  {
    key: 'site-ai',
    label: '站点与AI',
    icon: 'Globe',
    items: [
      {
        key: 'site-pages',
        label: '站点页面',
        icon: 'Globe',
        href: '/site-pages',
        permission: 'site_page.view',
      },
      {
        key: 'clinic-programs',
        label: '诊所项目',
        icon: 'Building2',
        href: '/clinic-programs',
        permission: 'clinic_program.view',
        siteScope: 'intl',
        badge: 'new' as const,
      },
      {
        key: 'ai-features',
        label: 'AI功能',
        icon: 'Sparkles',
        href: '/ai/features',
        permission: 'ai.view',
      },
      {
        key: 'ai-tasks',
        label: 'AI任务',
        icon: 'Zap',
        href: '/ai/tasks',
        permission: 'ai.view',
      },
      {
        key: 'ai-logs',
        label: 'AI日志',
        icon: 'Activity',
        href: '/ai-logs',
        permission: 'ai.view',
      },
    ],
  },

  // ============================================
  // 8. 系统与日志 - 系统设置 + 日志 + 路由
  // ============================================
  {
    key: 'system-logs',
    label: '系统与日志',
    icon: 'Settings',
    items: [
      {
        key: 'system-admins',
        label: '管理员管理',
        icon: 'UserCog',
        href: '/system/admins',
        permission: 'system.view',
      },
      {
        key: 'dictionaries',
        label: '字典配置',
        icon: 'BookOpen',
        href: '/system/dictionaries',
        permission: 'system.view',
      },
      {
        key: 'configs',
        label: '系统配置',
        icon: 'Settings',
        href: '/system/configs',
        permission: 'system.edit',
      },
      {
        key: 'feature-flags',
        label: '功能开关',
        icon: 'ToggleRight',
        href: '/system/feature-flags',
        permission: 'system.edit',
      },
      {
        key: 'notification-templates',
        label: '通知模板',
        icon: 'Bell',
        href: '/notifications',
        permission: 'system.view',
      },
      {
        key: 'operation-logs',
        label: '操作日志',
        icon: 'ScrollText',
        href: '/operation-logs',
        permission: 'system.view',
      },
      {
        key: 'audit-logs',
        label: '审计日志',
        icon: 'Search',
        href: '/system/audit-logs',
        permission: 'system.view',
      },
      {
        key: 'route-registry',
        label: '路由注册',
        icon: 'Route',
        href: '/routes',
        permission: 'route.view',
      },
      {
        key: 'coming-soon',
        label: '占位模板',
        icon: 'Construction',
        href: '/routes/templates',
        permission: 'route.view',
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
    { label: '运营中枢', href: '/dashboard' }
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

// 获取当前导航组
export function getCurrentNavGroup(pathname: string): NavGroup | undefined {
  return ADMIN_NAVIGATION.find(group => 
    group.items.some(item => item.href && pathname.startsWith(item.href))
  );
}

// 根据站点过滤导航
export function filterNavigationBySite(
  navigation: NavGroup[],
  site: 'cn' | 'intl' | 'all'
): NavGroup[] {
  if (site === 'all') return navigation;
  
  return navigation
    .filter(group => {
      // 过滤整组
      if (group.siteScope && group.siteScope !== site && group.siteScope !== 'all' && group.siteScope !== 'global') {
        return false;
      }
      return true;
    })
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        // 过滤单项
        if (item.siteScope && item.siteScope !== site && item.siteScope !== 'all' && item.siteScope !== 'global') {
          return false;
        }
        return true;
      })
    }))
    .filter(group => group.items.length > 0);
}

// 8 大模块图标映射 (Lucide icons)
export const MODULE_ICONS: Record<string, string> = {
  'overview': 'LayoutDashboard',
  'users-audit': 'Users',
  'courses-growth': 'GraduationCap',
  'products-purchase': 'Package',
  'content-community': 'FileEdit',
  'orders-finance': 'Receipt',
  'site-ai': 'Globe',
  'system-logs': 'Settings',
};
