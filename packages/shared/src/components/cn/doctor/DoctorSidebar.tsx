'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MessageCircle,
  GraduationCap,
  TrendingUp,
  Briefcase,
  Rocket,
  MessagesSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';

interface NavItem {
  id: string;
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

export function DoctorSidebar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  const navItems: NavItem[] = [
    { id: 'home', href: `/${locale}/doctor`, icon: <LayoutDashboard className="w-5 h-5" />, label: dw.navHome || '工作台' },
    { id: 'clients', href: `/${locale}/doctor/clients`, icon: <Users className="w-5 h-5" />, label: dw.navClients || '客户管理' },
    { id: 'records', href: `/${locale}/doctor/records`, icon: <ClipboardList className="w-5 h-5" />, label: dw.navRecords || '电子病历' },
    { id: 'consultations', href: `/${locale}/doctor/consultations`, icon: <MessageCircle className="w-5 h-5" />, label: dw.navConsultations || '在线问诊' },
    { id: 'courses', href: `/${locale}/doctor/courses`, icon: <GraduationCap className="w-5 h-5" />, label: dw.navCourses || '我的课程' },
    { id: 'growth', href: `/${locale}/doctor/growth`, icon: <TrendingUp className="w-5 h-5" />, label: dw.navGrowth || '成长档案' },
    { id: 'career', href: `/${locale}/doctor/career`, icon: <Briefcase className="w-5 h-5" />, label: dw.navCareer || '职业机会' },
    { id: 'startup', href: `/${locale}/doctor/startup`, icon: <Rocket className="w-5 h-5" />, label: dw.navStartup || '创业中心' },
    { id: 'community', href: `/${locale}/doctor/community`, icon: <MessagesSquare className="w-5 h-5" />, label: dw.navCommunity || '医生社区' },
    { id: 'settings', href: `/${locale}/doctor/settings`, icon: <Settings className="w-5 h-5" />, label: dw.navSettings || '设置' },
  ];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobileOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen, isMobile]);

  const isActive = (href: string) => {
    if (href === `/${locale}/doctor`) {
      return pathname === href || pathname === `/${locale}/doctor/`;
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    if (logout) await logout();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand - 点击返回主站 */}
      <div className="px-6 py-5 border-b border-slate-100">
        <Link href={`/${locale}`} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-vetsphere.png" alt="宠医界" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm block leading-tight group-hover:text-amber-600 transition-colors">
              {dw.sidebarBrand || '宠医界'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {dw.sidebarRole || '医生工作台'}
            </span>
          </div>
        </Link>
      </div>

      {/* User info */}
      {user && (
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
              {(user.name || 'D').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.name || '医生'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.email || ''}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => isMobile && setIsMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active
                  ? 'bg-amber-50 text-amber-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <span className={active ? 'text-amber-600' : 'text-slate-400'}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 浏览主站 + Logout */}
      <div className="px-3 py-3 border-t border-slate-100 space-y-0.5">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all"
        >
          <Home className="w-5 h-5" />
          <span>浏览主站</span>
          <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>{dw.logout || '退出登录'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-vetsphere.png" alt="宠医界" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-slate-900 text-sm">{dw.sidebarBrand || '宠医界'}</span>
        </Link>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && isMobile && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile
            ? `fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`
            : 'hidden md:flex w-64 shrink-0 sticky top-0 h-screen'
          }
          bg-white border-r border-slate-200 flex-col
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export default DoctorSidebar;
