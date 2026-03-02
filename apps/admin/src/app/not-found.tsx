export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-black text-white mb-4">404</h1>
        <p className="text-slate-500 mb-8">页面不存在</p>
        <a href="/" className="text-emerald-400 hover:text-emerald-300 font-bold text-sm uppercase tracking-widest">
          返回首页
        </a>
      </div>
    </div>
  );
}
