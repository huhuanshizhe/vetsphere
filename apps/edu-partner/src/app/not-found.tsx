export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0A1F]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-purple-500 mb-4">404</h1>
        <p className="text-gray-400 text-lg mb-6">页面未找到</p>
        <a
          href="/"
          className="edu-button inline-block"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}
