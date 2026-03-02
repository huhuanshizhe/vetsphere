'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PORTAL_THEME } from '../../lib/constants';
import { UserRole } from '../../types';

interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarItems: SidebarItem[] | string[];
  user: {
    id?: string;
    name: string;
    role: UserRole;
  };
  activeTab: string;
  setActiveTab: (tab: string) => void;
  logout: () => void | Promise<void>;
  headerTitle?: string;
  headerSubtitle?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  sidebarItems,
  user,
  activeTab,
  setActiveTab,
  logout,
  headerTitle,
  headerSubtitle,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const theme = PORTAL_THEME[user.role] || PORTAL_THEME.Doctor;

  // Normalize sidebar items to consistent format
  const normalizedItems: SidebarItem[] = sidebarItems.map((item) =>
    typeof item === 'string' ? { id: item, label: item } : item
  );

  // Check viewport size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-sidebar]') && !target.closest('[data-menu-toggle]')) {
        setIsMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Close menu on tab change (mobile)
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [setActiveTab, isMobile]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen, isMobile]);

  const isAdmin = user.role === 'Admin';
  const isChinese = user.role === 'Admin' || user.role === 'ShopSupplier' || user.role === 'CourseProvider';

  return (
    <div className={`min-h-screen ${theme.colors.pageBg} text-slate-800 flex flex-col md:flex-row font-sans`}>
      {/* Mobile Header */}
      <header className={`md:hidden sticky top-0 z-40 ${theme.colors.sidebarBg} border-b border-white/10 px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-lg shadow-lg ${isAdmin ? 'bg-emerald-500 text-black' : 'bg-white text-slate-900'}`}>
            {theme.meta.icon}
          </div>
          <div>
            <span className={`font-black tracking-tight text-sm block ${isAdmin ? 'text-white' : 'text-slate-900'}`}>
              VetSphere
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isAdmin ? 'text-slate-500' : 'text-slate-400'}`}>
              {user.role}
            </span>
          </div>
        </div>
        
        {/* Hamburger Button */}
        <button
          data-menu-toggle
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-2 rounded-lg transition-colors ${isAdmin ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop fixed, Mobile drawer */}
      <aside
        data-sidebar
        className={`
          ${isMobile 
            ? `fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
            : 'hidden md:flex w-64 shrink-0'
          }
          ${theme.colors.sidebarBg} border-r border-slate-100/10 flex-col transition-colors duration-300
        `}
      >
        {/* Sidebar Header */}
        <div className="p-6 md:p-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-lg ${isAdmin ? 'bg-emerald-500 text-black' : 'bg-white text-slate-900'}`}>
              {theme.meta.icon}
            </div>
            <div>
              <span className={`font-black tracking-tight text-sm block ${isAdmin ? 'text-white' : 'text-slate-900'}`}>
                VetSphere
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isAdmin ? 'text-slate-500' : 'text-slate-400'}`}>
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 md:p-4 space-y-1 md:space-y-2 overflow-y-auto">
          {normalizedItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`
                w-full text-left px-3 md:px-4 py-3 md:py-3.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider md:tracking-widest transition-all
                min-h-[44px] flex items-center gap-2
                ${activeTab === item.id
                  ? theme.colors.sidebarActive
                  : `${theme.colors.sidebarText} hover:bg-white/5`
                }
              `}
            >
              {item.icon && <span className="text-lg">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-3 md:p-4 mt-auto border-t border-white/5">
          <button
            onClick={logout}
            className="w-full py-3 md:py-4 border border-slate-200/20 rounded-xl text-xs font-bold uppercase text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors min-h-[44px]"
          >
            {isChinese ? '退出登录' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 min-h-screen md:h-screen md:overflow-y-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 md:mb-10">
          <div>
            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-1 ${isAdmin ? 'text-white' : 'text-slate-900'}`}>
              {headerTitle || activeTab}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium">
              {headerSubtitle || (isChinese ? `欢迎回来, ${user.name}` : `Welcome back, ${user.name}`)}
            </p>
          </div>
        </header>

        {/* Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
export { DashboardLayout };
export type { DashboardLayoutProps, SidebarItem };
