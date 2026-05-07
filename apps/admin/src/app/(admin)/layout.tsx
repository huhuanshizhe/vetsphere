'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { SiteProvider } from '@/context/SiteContext';
import { ToastProvider } from '@/context/ToastContext';
import { useAuth } from '@vetsphere/shared/context/AuthContext';

function AdminLoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-slate-500 text-sm">加载中...</span>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 仅做"必须登录"校验；管理员角色由服务端 API 强制校验。
  // 当 user 已经从 sessionStorage 缓存恢复（即 user 非空）时，
  // 不再等待 loading 结束就放行，避免后台异步任务（如 /api/auth/me）
  // 偶发卡顿造成页面一直转圈。
  useEffect(() => {
    if (!isMounted) return;

    if (!loading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isMounted, loading, isAuthenticated, router]);

  // 服务端首屏与客户端首帧统一为同一套 loading UI，避免 session 恢复导致 hydration mismatch。
  if (!isMounted || (loading && !user)) {
    return <AdminLoadingScreen />;
  }

  if (!user) {
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
