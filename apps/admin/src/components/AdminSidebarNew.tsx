'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAVIGATION, NavGroup, NavItem } from '@/config/admin-navigation';
import { hasPermission } from '@/lib/permissions';

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
}

const AdminSidebarNew: React.FC<AdminSidebarNewProps> = ({
  user,
  permissions = ['*'], // 默认超级管理员
  onLogout,
  isMobile = false,
  isOpen = true,
  onClose,
}) => {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['main', 'doctor-verify']);

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

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    if (!canAccessItem(item)) return null;

    const active = item.href ? isActive(item.href) : false;
    const paddingLeft = depth === 0 ? 'pl-4' : 'pl-8';

    return (
      <Link
        key={item.key}
        href={item.href || '#'}
        onClick={() => isMobile && onClose?.()}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
          transition-all duration-150 min-h-[40px]
          ${paddingLeft}
          ${active
            ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }
        `}
      >
        <span className="text-base shrink-0">{item.icon}</span>
        <span className="truncate flex-1">{item.label}</span>
        {item.badge && (
          <span className={`
            px-1.5 py-0.5 text-[10px] font-bold rounded
            ${typeof item.badge === 'number'
              ? 'bg-red-500/20 text-red-400'
              : item.badge === 'new'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/20 text-amber-400'
            }
          `}>
            {typeof item.badge === 'number' ? item.badge : item.badge.toUpperCase()}
          </span>
        )}
      </Link>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    // 过滤掉用户无权限访问的项
    const accessibleItems = group.items.filter(canAccessItem);
    if (accessibleItems.length === 0) return null;

    const isExpanded = expandedGroups.includes(group.key);
    const hasActiveChild = accessibleItems.some(item => 
      item.href ? isActive(item.href) : false
    );

    return (
      <div key={group.key} className="mb-1">
        {/* 分组标题 */}
        <button
          onClick={() => toggleGroup(group.key)}
          className={`
            w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider
            ${hasActiveChild ? 'text-emerald-400' : 'text-slate-600'}
            hover:text-slate-400 transition-colors
          `}
        >
          <span>{group.label}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 分组内容 */}
        <div className={`
          space-y-0.5 overflow-hidden transition-all duration-200
          ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}>
          {accessibleItems.map(item => renderNavItem(item))}
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`
        ${isMobile
          ? `fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'hidden md:flex w-64 shrink-0 h-screen'
        }
        bg-[#0a0f1a] border-r border-white/5 flex-col
      `}
    >
      {/* Header */}
      <div className="p-5 border-b border-white/5 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-black font-black text-sm shadow-lg shadow-emerald-500/20">
            VS
          </div>
          <div>
            <span className="font-black text-sm text-white block tracking-tight">VetSphere</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">管理后台</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {ADMIN_NAVIGATION.map(renderNavGroup)}
      </nav>

      {/* User info & logout */}
      <div className="p-3 border-t border-white/5 shrink-0">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs font-bold text-white truncate">{user.name}</p>
          <p className="text-[10px] text-slate-600 truncate">{user.email}</p>
          <p className="text-[10px] text-emerald-500 font-medium mt-0.5">{user.role}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full py-2.5 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebarNew;
