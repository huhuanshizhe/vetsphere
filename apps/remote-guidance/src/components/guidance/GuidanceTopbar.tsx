'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { useGuidanceSessionBridge } from '@/components/guidance/GuidanceSessionBridge';

export default function GuidanceTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout, doctorPrivilegeStatus } = useAuth();
  const { isSyncing } = useGuidanceSessionBridge();

  const authHref = `/auth?redirect=${encodeURIComponent(pathname || '/guidance')}`;
  const hideNav = pathname?.startsWith('/join/');

  if (hideNav) {
    return null;
  }

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold text-slate-950">
            VetSphere Remote Guidance
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-slate-600 md:flex">
            <Link href="/consultations" className="transition hover:text-amber-700">
              付费咨询台
            </Link>
            <Link href="/guidance" className="transition hover:text-teal-700">
              远程指导台
            </Link>
            <a
              href="https://vetsphere.cn/zh"
              className="transition hover:text-teal-700"
              target="_blank"
              rel="noreferrer"
            >
              返回主站
            </a>
          </nav>
        </div>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-slate-900">
                {user.name || user.mobile || '已登录用户'}
              </div>
              <div className="text-xs text-slate-500">医生状态：{doctorPrivilegeStatus}</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push(authHref);
              }}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              退出登录
            </button>
          </div>
        ) : isSyncing ? (
          <div className="text-sm font-medium text-slate-500">正在同步主站登录态…</div>
        ) : (
          <div className="flex items-center gap-3">
            <a
              href="https://vetsphere.cn/zh/auth"
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm font-medium text-slate-500 transition hover:text-slate-700 sm:inline"
            >
              主站登录页
            </a>
            <Link
              href={authHref}
              className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              登录医生账号
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
