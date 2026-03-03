'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, RotateCcw, ArrowLeft, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/30 to-white flex flex-col items-center justify-center text-center p-6">
      <div className="max-w-lg mx-auto">
        {/* 图标 */}
        <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <AlertTriangle className="w-10 h-10 text-amber-600" />
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-black text-slate-900 mb-4">
          页面遇到了一点小问题
        </h1>

        {/* 说明 */}
        <p className="text-lg text-slate-500 leading-relaxed mb-8">
          请刷新重试，或返回上一页继续浏览。如果问题持续出现，请稍后再试。
        </p>

        {/* 开发环境错误信息 */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-left">
            <p className="text-xs font-mono text-red-600 break-all">{error.message}</p>
            {error.digest && (
              <p className="text-xs font-mono text-red-400 mt-1">Digest: {error.digest}</p>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重新加载
          </button>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回上一页
          </button>
        </div>

        {/* 底部链接 */}
        <a
          href="/zh"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Home className="w-4 h-4" />
          回到首页
        </a>
      </div>
    </main>
  );
}
