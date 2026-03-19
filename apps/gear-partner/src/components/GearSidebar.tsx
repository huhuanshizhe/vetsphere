'use client';

import {
  LayoutDashboard,
  Package,
  Truck,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Bell,
} from 'lucide-react';

interface GearSidebarProps {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: '概览', label: '概览', icon: LayoutDashboard },
  { id: '库存管理', label: '库存管理', icon: Package },
  { id: '订单履约', label: '订单履约', icon: Truck },
  { id: '数据分析', label: '数据分析', icon: BarChart3 },
];

const BOTTOM_ITEMS = [
  { id: 'settings', label: '设置', icon: Settings },
  { id: 'help', label: '帮助中心', icon: HelpCircle },
];

export default function GearSidebar({ tabs, activeTab, setActiveTab, user, onLogout }: GearSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">Gear Partner</h1>
            <p className="text-xs text-slate-400">供应商管理平台</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">主菜单</span>
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="font-medium text-sm">{item.label}</span>
              {item.id === '订单履约' && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  3
                </span>
              )}
            </button>
          );
        })}

        {/* Bottom Section */}
        <div className="pt-4 mt-4 border-t border-slate-700/50">
          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">其他</span>
          </div>
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all text-left"
              >
                <Icon className="w-5 h-5 text-slate-500" />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-slate-700/50">
        {/* Notification */}
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 transition-all mb-2">
          <Bell className="w-5 h-5 text-slate-500" />
          <span className="font-medium text-sm">通知</span>
          <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            5
          </span>
        </button>

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-800/50 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </div>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">退出登录</span>
        </button>
      </div>
    </div>
  );
}
