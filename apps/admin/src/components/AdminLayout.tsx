'use client';

import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: { name: string; email: string; role: string };
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: string[];
  onLogout: () => void | Promise<void>;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  user,
  activeTab,
  onTabChange,
  tabs,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen, isMobile]);

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    if (isMobile) setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 flex flex-col md:flex-row font-sans">
      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-40 bg-black border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-black text-xs">
            VS
          </div>
          <div>
            <span className="font-black text-sm text-white block leading-tight">VetSphere</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Admin</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
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

      {/* Mobile overlay */}
      {isMobileMenuOpen && isMobile && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <AdminSidebar
        user={user}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={tabs}
        onLogout={onLogout}
        isMobile={isMobile}
        isOpen={isMobileMenuOpen}
      />

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 min-h-screen md:h-screen md:overflow-y-auto">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-1">
            {activeTab}
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            欢迎回来, {user.name}
          </p>
        </header>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
