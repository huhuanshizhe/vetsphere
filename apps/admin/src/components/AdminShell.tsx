'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import AdminSidebarNew from './AdminSidebarNew';
import { getBreadcrumbs } from '@/config/admin-navigation';

interface AdminShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Admin 后台主布局壳
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen, isMobile]);

  // 权限检查
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (user.role !== 'Admin') {
      router.push('/');
    }
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const breadcrumbs = getBreadcrumbs(pathname);

  if (!user || user.role !== 'Admin') {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">正在验证权限...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 flex">
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0a0f1a] border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-black text-xs">
            VS
          </div>
          <div>
            <span className="font-black text-sm text-white block leading-tight">VetSphere</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Admin</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile overlay */}
      {isMobileMenuOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <AdminSidebarNew
        user={{ name: user.name, email: user.email, role: user.role }}
        permissions={['*']} // TODO: 从数据库获取真实权限
        onLogout={handleLogout}
        isMobile={isMobile}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 min-h-screen md:h-screen md:overflow-y-auto">
        <div className="pt-16 md:pt-0">
          {/* Page header */}
          <div className="sticky top-0 z-20 bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/5">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href}>
                    {index > 0 && <span className="text-slate-600">/</span>}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-slate-400">{crumb.label}</span>
                    ) : (
                      <a 
                        href={crumb.href} 
                        className="hover:text-slate-300 transition-colors"
                      >
                        {crumb.label}
                      </a>
                    )}
                  </React.Fragment>
                ))}
              </nav>

              {/* Title & actions */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  {title && (
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                  )}
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
