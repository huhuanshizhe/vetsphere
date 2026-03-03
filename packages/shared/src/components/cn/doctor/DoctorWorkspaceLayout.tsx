'use client';

import React from 'react';
import { DoctorSidebar } from './DoctorSidebar';
import { DoctorTopbar } from './DoctorTopbar';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';

interface DoctorWorkspaceLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export function DoctorWorkspaceLayout({ children, locale }: DoctorWorkspaceLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    if (typeof window !== 'undefined') {
      router.replace(`/${locale}/auth`);
    }
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">正在跳转至登录...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <DoctorSidebar locale={locale} />
      {/* Main content area with topbar */}
      <div className="flex-1 flex flex-col min-h-screen md:h-screen">
        <DoctorTopbar locale={locale} />
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DoctorWorkspaceLayout;
