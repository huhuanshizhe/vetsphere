'use client';

import React from 'react';

interface AdminSidebarProps {
  user: { name: string; email: string; role: string };
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: string[];
  onLogout: () => void | Promise<void>;
  isMobile: boolean;
  isOpen: boolean;
}

const TAB_ICONS: Record<string, string> = {
  '概览': '📊',
  'AI 大脑中枢': '🧠',
  '全局课程管理': '📚',
  '课程订单': '🎓',
  '商品管理': '📦',
  '商城订单': '🛒',
  '用户管理': '👥',
  '财务报表': '💰',
  '退款管理': '💸',
};

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  tabs,
  onLogout,
  isMobile,
  isOpen,
}) => {
  return (
    <aside
      className={`
        ${isMobile
          ? `fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'hidden md:flex w-64 shrink-0'
        }
        bg-black border-r border-white/5 flex-col
      `}
    >
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-black font-black text-sm shadow-lg shadow-emerald-500/20">
            VS
          </div>
          <div>
            <span className="font-black text-sm text-white block tracking-tight">VetSphere</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">管理中枢</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`
              w-full text-left px-4 py-3 md:py-3.5 rounded-xl text-sm font-bold transition-all
              min-h-[44px] flex items-center gap-3
              ${activeTab === tab
                ? 'text-emerald-400 bg-white/5 border-l-2 border-emerald-500'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
              }
            `}
          >
            <span className="text-base">{TAB_ICONS[tab] || '📋'}</span>
            <span className="truncate">{tab}</span>
          </button>
        ))}
      </nav>

      {/* User info & logout */}
      <div className="p-3 md:p-4 mt-auto border-t border-white/5 space-y-3">
        <div className="px-4 py-2">
          <p className="text-xs font-bold text-white truncate">{user.name}</p>
          <p className="text-[10px] text-slate-600 truncate">{user.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full py-3 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all min-h-[44px]"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
