'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { SiteProvider } from '@/context/SiteContext';
import { ToastProvider } from '@/context/ToastContext';
import { useAuth } from '@vetsphere/shared/context/AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();

  // 仅做"必须登录"校验；管理员角色由服务端 API 强制校验。
  // 当 user 已经从 sessionStorage 缓存恢复（即 user 非空）时，
  // 不再等待 loading 结束就放行，避免后台异步任务（如 /api/auth/me）
  // 偶发卡顿造成页面一直转圈。
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router]);

  if (!loading && !isAuthenticated) {
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
