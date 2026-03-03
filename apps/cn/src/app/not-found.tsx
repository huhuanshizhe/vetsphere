import Link from 'next/link';

export default function RootNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center text-center p-6">
      {/* 图标 */}
      <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
        <span className="text-5xl">&#x1F50D;</span>
      </div>

      {/* 标题 */}
      <h1 className="text-3xl font-black text-slate-900 mb-4">
        找不到这个页面了
      </h1>

      {/* 说明 */}
      <p className="text-lg text-slate-500 max-w-md mx-auto mb-10">
        请访问中文版首页继续浏览。
      </p>

      {/* 返回首页 */}
      <Link
        href="/zh"
        className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
      >
        前往首页
      </Link>
    </div>
  );
}
