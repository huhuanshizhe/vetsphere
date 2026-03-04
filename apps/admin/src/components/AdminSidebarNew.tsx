'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAVIGATION, NavGroup, NavItem, filterNavigationBySite } from '@/config/admin-navigation';
import { hasPermission } from '@/lib/permissions';
import { useSite } from '@/context/SiteContext';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  UserCog,
  Shield,
  ClipboardCheck,
  Stethoscope,
  FileText,
  MessageSquare,
  GraduationCap,
  BookOpen,
  ListTree,
  UserCheck,
  Star,
  Tags,
  TrendingUp,
  History,
  Mic,
  Package,
  ShoppingBag,
  Link as LinkIcon,
  ClipboardList,
  FileEdit,
  Navigation,
  MessageCircle,
  MessagesSquare,
  Flag,
  Receipt,
  Crown,
  Ticket,
  Globe,
  Building2,
  Sparkles,
  Zap,
  Activity,
  Settings,
  ToggleRight,
  Bell,
  ScrollText,
  Search,
  Route,
  Construction,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  LucideIcon,
} from 'lucide-react';

// Lucide 图标映射
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  BarChart3,
  Users,
  UserCog,
  Shield,
  ClipboardCheck,
  Stethoscope,
  FileText,
  MessageSquare,
  GraduationCap,
  BookOpen,
  ListTree,
  UserCheck,
  Star,
  Tags,
  TrendingUp,
  History,
  Mic,
  Package,
  ShoppingBag,
  Link: LinkIcon,
  ClipboardList,
  FileEdit,
  Navigation,
  MessageCircle,
  MessagesSquare,
  Flag,
  Receipt,
  Crown,
  Ticket,
  Globe,
  Building2,
  Sparkles,
  Zap,
  Activity,
  Settings,
  ToggleRight,
  Bell,
  ScrollText,
  Search,
  Route,
  Construction,
};

interface AdminSidebarNewProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  permissions?: string[];
  onLogout: () => void | Promise<void>;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AdminSidebarNew: React.FC<AdminSidebarNewProps> = ({
  user,
  permissions = ['*'],
  onLogout,
  isMobile = false,
  isOpen = true,
  onClose,
  collapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const { currentSite } = useSite();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['overview', 'users-audit']);

  // 根据当前站点过滤导航
  const filteredNavigation = useMemo(() => {
    if (currentSite === 'global') return ADMIN_NAVIGATION;
    return filterNavigationBySite(ADMIN_NAVIGATION, currentSite as 'cn' | 'intl' | 'all');
  }, [currentSite]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupKey)
        ? prev.filter(k => k !== groupKey)
        : [...prev, groupKey]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const canAccessItem = (item: NavItem) => {
    if (!item.permission) return true;
    return hasPermission(permissions, item.permission);
  };

  const getIcon = (iconName: string): LucideIcon => {
    return ICON_MAP[iconName] || LayoutDashboard;
  };

  const renderNavItem = (item: NavItem) => {
    if (!canAccessItem(item)) return null;

    // 根据站点过滤单项
    if (currentSite !== 'global' && item.siteScope && item.siteScope !== 'all' && item.siteScope !== currentSite) {
      return null;
    }

    const active = item.href ? isActive(item.href) : false;
    const Icon = getIcon(item.icon);

    // 站点标签
    const scopeTag = currentSite === 'global' && item.siteScope && item.siteScope !== 'all'
      ? item.siteScope === 'cn' ? 'CN' : 'INTL'
      : null;

    return (
      <Link
        key={item.key}
        href={item.href || '#'}
        onClick={() => isMobile && onClose?.()}
        title={collapsed ? item.label : undefined}
        className={`
          group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium
          transition-all duration-150
          ${collapsed ? 'justify-center' : ''}
          ${active
            ? 'bg-emerald-50 text-emerald-700 border-l-3 border-emerald-500'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }
        `}
      >
        <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            {scopeTag && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 text-slate-500">
                {scopeTag}
              </span>
            )}
            {item.badge && (
              <span className={`
                px-1.5 py-0.5 text-[10px] font-bold rounded
                ${typeof item.badge === 'number'
                  ? 'bg-red-100 text-red-600'
                  : item.badge === 'new'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-amber-100 text-amber-600'
                }
              `}>
                {typeof item.badge === 'number' ? item.badge : item.badge.toUpperCase()}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    // 过滤掉用户无权限访问的项
    const accessibleItems = group.items.filter(item => {
      if (!canAccessItem(item)) return false;
      // 根据站点过滤
      if (currentSite !== 'global' && item.siteScope && item.siteScope !== 'all' && item.siteScope !== currentSite) {
        return false;
      }
      return true;
    });
    if (accessibleItems.length === 0) return null;

    const isExpanded = expandedGroups.includes(group.key);
    const hasActiveChild = accessibleItems.some(item => 
      item.href ? isActive(item.href) : false
    );

    const GroupIcon = getIcon(group.icon);

    // 折叠模式 - 只显示分组图标
    if (collapsed) {
      return (
        <div key={group.key} className="mb-2">
          <button
            onClick={() => toggleGroup(group.key)}
            title={group.label}
            className={`
              w-full flex items-center justify-center p-3 rounded-lg
              transition-all duration-150
              ${hasActiveChild 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }
            `}
          >
            <GroupIcon className="w-5 h-5" />
          </button>
        </div>
      );
    }

    // 站点标签
    const scopeTag = currentSite === 'global' && group.siteScope && group.siteScope !== 'all'
      ? group.siteScope === 'cn' ? 'CN' : 'INTL'
      : null;

    return (
      <div key={group.key} className="mb-1">
        {/* 分组标题 */}
        <button
          onClick={() => toggleGroup(group.key)}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold
            rounded-lg transition-colors
            ${hasActiveChild ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700'}
            hover:bg-slate-50
          `}
        >
          <GroupIcon className={`w-5 h-5 ${hasActiveChild ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="flex-1 text-left">{group.label}</span>
          {scopeTag && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 text-slate-500 mr-1">
              {scopeTag}
            </span>
          )}
          {isExpanded 
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronRight className="w-4 h-4 text-slate-400" />
          }
        </button>

        {/* 分组内容 */}
        <div className={`
          ml-3 pl-3 border-l border-slate-200 space-y-0.5 overflow-hidden transition-all duration-200
          ${isExpanded ? 'max-h-[800px] opacity-100 mt-1' : 'max-h-0 opacity-0'}
        `}>
          {accessibleItems.map(item => renderNavItem(item))}
        </div>
      </div>
    );
  };

  const sidebarWidth = collapsed ? 'w-[64px]' : 'w-64';

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          ${isMobile
            ? `fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `hidden md:flex ${sidebarWidth} shrink-0 h-screen transition-all duration-200`
          }
          bg-white border-r border-slate-200 flex-col
        `}
      >
        {/* Header */}
        <div className={`p-4 border-b border-slate-200 shrink-0 ${collapsed ? 'px-3' : ''}`}>
          <Link href="/dashboard" className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-sm">
              VS
            </div>
            {!collapsed && (
              <div>
                <span className="font-bold text-sm text-slate-900 block">VetSphere</span>
                <span className="text-[11px] font-medium text-slate-500">运营中枢</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto scrollbar-thin ${collapsed ? 'p-2' : 'p-3'}`}>
          {filteredNavigation.map(renderNavGroup)}
        </nav>

        {/* Footer - Collapse toggle & User */}
        <div className={`border-t border-slate-200 shrink-0 ${collapsed ? 'p-2' : 'p-3'}`}>
          {/* Collapse toggle */}
          {!isMobile && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium
                text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors mb-2
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
              {!collapsed && <span>收起侧边栏</span>}
            </button>
          )}

          {/* User info */}
          {!collapsed && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">{user.role}</p>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={onLogout}
            title={collapsed ? '退出登录' : undefined}
            className={`
              w-full py-2.5 border border-slate-200 rounded-lg text-sm font-medium
              text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all
              flex items-center gap-2
              ${collapsed ? 'justify-center px-2' : 'px-3'}
            `}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>退出登录</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebarNew;
