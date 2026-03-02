export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-500 mb-4">404</h1>
        <p className="text-gray-400 text-lg mb-6">页面未找到</p>
        <a
          href="/"
          className="gear-button inline-block"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}
