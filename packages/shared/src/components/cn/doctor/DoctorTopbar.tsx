'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  ListChecks,
  Plus,
  ChevronDown,
  ClipboardList,
  PawPrint,
  MessageCircle,
  User,
  Settings,
  Home,
  GraduationCap,
  ShoppingCart,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';

export function DoctorTopbar({ locale }: { locale: string }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const quickCreateItems = [
    { label: dw.topbarNewRecord || '新建病历', icon: <ClipboardList className="w-4 h-4" />, href: `/${locale}/doctor/records` },
    { label: dw.topbarNewPetProfile || '新建宠物档案', icon: <PawPrint className="w-4 h-4" />, href: `/${locale}/doctor/clients` },
    { label: dw.topbarNewConsult || '发起问诊', icon: <MessageCircle className="w-4 h-4" />, href: `/${locale}/doctor/consultations` },
  ];

  const userMenuItems = [
    { 
      label: '我的资料', 
      icon: <User className="w-4 h-4" />, 
      href: `/${locale}/doctor/settings?tab=profile`,
      divider: false,
    },
    { 
      label: '账号设置', 
      icon: <Settings className="w-4 h-4" />, 
      href: `/${locale}/doctor/settings?tab=account`,
      divider: true,
    },
    { 
      label: '返回主站', 
      icon: <Home className="w-4 h-4" />, 
      href: `/${locale}`,
      divider: false,
    },
    { 
      label: '课程中心', 
      icon: <GraduationCap className="w-4 h-4" />, 
      href: `/${locale}/courses`,
      divider: false,
    },
    { 
      label: '临床器械与耗材', 
      icon: <ShoppingCart className="w-4 h-4" />, 
      href: `/${locale}/shop`,
      divider: true,
    },
  ];

  const handleLogout = async () => {
    setShowUserMenu(false);
    if (logout) await logout();
  };

  return (
    <div className="hidden md:flex items-center justify-between h-14 px-6 border-b border-slate-200 bg-white shrink-0">
      {/* Left: Search */}
      <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 w-72 border border-slate-100 focus-within:border-amber-300 focus-within:ring-1 focus-within:ring-amber-200 transition-all">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder={dw.topbarSearch || '搜索客户、病历、课程...'}
          className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none w-full"
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Task reminders */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors" title={dw.topbarTasks || '待办提醒'}>
          <ListChecks className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors" title={dw.topbarNotifications || '通知'}>
          <Bell className="w-5 h-5" />
        </button>

        {/* Quick create */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowQuickCreate(!showQuickCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{dw.topbarQuickCreate || '快速创建'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showQuickCreate ? 'rotate-180' : ''}`} />
          </button>
          {showQuickCreate && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowQuickCreate(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                {quickCreateItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => setShowQuickCreate(false)}
                  >
                    <span className="text-slate-400">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* User avatar with dropdown menu */}
        <div className="relative ml-2 pl-2 border-l border-slate-200">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
              {(user?.name || 'D').charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden lg:block">{user?.name || '医生'}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform hidden lg:block ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>
          
          {/* User dropdown menu */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                {/* User info header */}
                <div className="px-4 py-2 border-b border-slate-100 mb-1">
                  <p className="text-sm font-bold text-slate-900">{user?.name || '医生'}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
                </div>
                
                {/* Menu items */}
                {userMenuItems.map((item, index) => (
                  <React.Fragment key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <span className="text-slate-400">{item.icon}</span>
                      {item.label}
                    </Link>
                    {item.divider && index < userMenuItems.length - 1 && (
                      <div className="my-1 border-t border-slate-100" />
                    )}
                  </React.Fragment>
                ))}
                
                {/* Logout */}
                <div className="mt-1 pt-1 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoctorTopbar;
