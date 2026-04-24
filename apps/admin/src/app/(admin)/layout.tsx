'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { SiteProvider } from '@/context/SiteContext';
import { ToastProvider } from '@/context/ToastContext';
import { useAuth } from '@vetsphere/shared/context/AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  // 仅做"必须登录"校验；管理员角色由服务端 API 强制校验。
  // 这里不再对 user.role 做硬性比对——因为 role 取自 supabase user_metadata，
  // 部分管理员角色记录在 profiles/admin_users 表中，metadata 可能为空，
  // 强制比对会把已登录的管理员错误地踢回登录页（表现为页面一直转圈）。
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <SiteProvider>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </SiteProvider>
  );
}
