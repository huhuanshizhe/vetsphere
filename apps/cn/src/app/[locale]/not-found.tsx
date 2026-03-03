'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, TrendingUp, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const pathname = usePathname();
  // 从路径中提取 locale（/zh/xxx -> zh），fallback 到 zh
  const segments = pathname?.split('/').filter(Boolean) || [];
  const locale = segments[0] || 'zh';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center text-center p-6">
      {/* 装饰 */}
      <div className="absolute top-0 left-1/3 w-80 h-80 bg-emerald-100/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-lg mx-auto">
        {/* 图标 */}
        <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <span className="text-5xl">&#x1F50D;</span>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
          找不到这个页面了
        </h1>

        {/* 说明 */}
        <p className="text-lg text-slate-500 leading-relaxed mb-4">
          这个页面可能已下线或地址有变，推荐下面的入口继续探索。
        </p>

        {/* 返回上一页 */}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          返回上一页
        </button>

        {/* 推荐入口 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            推荐前往
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href={`/${locale}/courses`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group"
            >
              <BookOpen className="w-6 h-6 text-blue-500 group-hover:text-blue-600 transition-colors" />
              <span className="text-sm font-bold text-slate-700">课程中心</span>
            </Link>
            <Link
              href={`/${locale}/growth-system`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors group"
            >
              <TrendingUp className="w-6 h-6 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
              <span className="text-sm font-bold text-slate-700">成长体系</span>
            </Link>
            <Link
              href={`/${locale}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <Home className="w-6 h-6 text-slate-500 group-hover:text-slate-600 transition-colors" />
              <span className="text-sm font-bold text-slate-700">首页</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
