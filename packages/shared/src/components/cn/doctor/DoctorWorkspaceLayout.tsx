'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DoctorSidebar } from './DoctorSidebar';
import { DoctorTopbar } from './DoctorTopbar';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';

interface DoctorWorkspaceLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export function DoctorWorkspaceLayout({ children, locale }: DoctorWorkspaceLayoutProps) {
  const { user, loading, applicationStatus, applicationLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Show loading state
  if (loading || applicationLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated, with current path as redirect target
  if (!user) {
    if (typeof window !== 'undefined') {
      const redirectUrl = encodeURIComponent(pathname);
      router.replace(`/${locale}/auth?redirect=${redirectUrl}`);
    }
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">正在跳转至登录...</p>
      </div>
    );
  }

  // Check application status - only approved users can access doctor workspace
  if (applicationStatus !== 'approved') {
    if (typeof window !== 'undefined') {
      // Route based on status
      if (!applicationStatus || applicationStatus === 'draft') {
        router.replace(`/${locale}/register/doctor`);
      } else {
        // pending_review or rejected
        router.replace(`/${locale}/register/status`);
      }
    }
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-2">
            {applicationStatus === 'pending_review' 
              ? '您的申请正在审核中...' 
              : applicationStatus === 'rejected'
              ? '您的申请需要重新提交'
              : '请先完成医生入驻申请'
            }
          </p>
          <p className="text-slate-400 text-xs">正在跳转...</p>
        </div>
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
