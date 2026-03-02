'use client';

interface GearSidebarProps {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

const TAB_ICONS: Record<string, string> = {
  '概览': '📊',
  '库存管理': '📦',
  '订单履约': '🚚',
  '数据分析': '📈',
};

export default function GearSidebar({ tabs, activeTab, setActiveTab, user, onLogout }: GearSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-blue-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gear-gradient flex items-center justify-center">
            <span className="text-xl">🔧</span>
          </div>
          <div>
            <h1 className="font-bold text-white">器械供应商</h1>
            <p className="text-xs text-gray-500">VetSphere Partner</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
              activeTab === tab
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-lg">{TAB_ICONS[tab] || '📄'}</span>
            <span className="font-medium">{tab}</span>
          </button>
        ))}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-blue-500/20">
        {user && (
          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <span>🚪</span>
          <span className="font-medium">退出登录</span>
        </button>
      </div>
    </div>
  );
}
