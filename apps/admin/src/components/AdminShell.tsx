'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import AdminSidebarNew from './AdminSidebarNew';
import SiteSwitcher from './SiteSwitcher';
import { getBreadcrumbs } from '@/config/admin-navigation';
import { Menu, X, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface AdminShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Admin 后台主布局壳 - 浅色主题版
 * 包含侧边栏、头部、面包屑、主内容区
 */
const AdminShell: React.FC<AdminShellProps> = ({
  children,
  title,
  subtitle,
  actions,
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMounted && isMobile !== undefined && isMobileMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMounted, isMobile, isMobileMenuOpen]);

  // 权限检查
  useEffect(() => {
    // 只在挂载后检查权限
    if (!isMounted) return;

    if (!user) {
      router.push('/');
      return;
    }
    if (user.role !== 'Admin') {
      router.push('/');
    }
  }, [user, router, isMounted]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const breadcrumbs = getBreadcrumbs(pathname);

  // 服务端渲染时不渲染任何内容，避免 Hydration 不匹配
  if (!isMounted || isMobile === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-slate-500 text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'Admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-slate-500 text-sm">正在验证权限...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-xs">
            VS
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 block leading-tight">VetSphere</span>
            <span className="text-[10px] font-medium text-slate-500">运营中枢</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </header>

      {/* Sidebar */}
      <AdminSidebarNew
        user={{ name: user.name, email: user.email, role: user.role }}
        permissions={['*']} // TODO: 从数据库获取真实权限
        onLogout={handleLogout}
        isMobile={isMobile}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content */}
      <main className="flex-1 min-h-screen md:h-screen md:overflow-y-auto">
        <div className="pt-16 md:pt-0">
          {/* Page header */}
          <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              {/* Top bar: Breadcrumbs + Site Switcher */}
              <div className="flex items-center justify-between mb-3">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-1.5 text-xs text-slate-500">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.href}>
                      {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                      {index === breadcrumbs.length - 1 ? (
                        <span className="text-slate-700 font-medium">{crumb.label}</span>
                      ) : (
                        <Link 
                          href={crumb.href} 
                          className="hover:text-slate-700 transition-colors"
                        >
                          {crumb.label}
                        </Link>
                      )}
                    </React.Fragment>
                  ))}
                </nav>

                {/* Site Switcher */}
                <SiteSwitcher permissions={['*']} size="sm" />
              </div>

              {/* Title & actions */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    {title && (
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        {title}
                      </h1>
                    )}
                    {subtitle && (
                      <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                    )}
                  </div>
                </div>
                {actions && (
                  <div className="flex items-center gap-2 shrink-0">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminShell;
