'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import type { SupportedLocale } from '../site-config.types';

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { cart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { siteConfig, isCN } = useSiteConfig();

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { logout } = useAuth();

  // Use locales from site config
  const locales = siteConfig.locales;

  // Get current locale from pathname
  const getCurrentLocale = (): SupportedLocale => {
    const segments = pathname.split('/');
    if (locales.includes(segments[1] as SupportedLocale)) {
      return segments[1] as SupportedLocale;
    }
    return language;
  };

  const locale = getCurrentLocale();

  // Helper to create locale-aware links
  const localePath = (path: string) => `/${locale}${path}`;

  // Check if path is active (ignoring locale prefix)
  const isActive = (path: string) => {
    const currentPath = pathname.replace(`/${locale}`, '') || '/';
    return currentPath === path;
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-[100] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isScrolled
          ? 'bg-white shadow-xl shadow-slate-200/40 border-b border-slate-100 py-2'
          : 'bg-white/70 backdrop-blur-md border-b border-transparent py-0'
      }`}
    >
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-16 h-16 md:h-20 flex items-center justify-between">

        {/* Logo */}
        <Link href={localePath('/')} className="flex items-center gap-3 group relative">
          {isCN ? (
            <>
              {/* Logo icon: crop to show only the left sphere from the full logo image */}
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-cn.jpg" alt="" className="h-full w-auto max-w-none object-cover" style={{ aspectRatio: '1/1', objectPosition: '28% center' }} />
              </div>
              <span className="text-[22px] font-black tracking-tight text-[#1a6e4e] leading-none group-hover:text-[#00A884] transition-colors duration-300">
                宠医界
              </span>
            </>
          ) : (
            <>
              <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 border-2 border-[#00A884]/20 rounded-xl rotate-12 group-hover:rotate-90 transition-transform duration-700"></div>
                <div className="absolute inset-0 border-2 border-[#00A884] rounded-xl -rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-sm"></div>
                <div className="relative w-8 h-8 bg-[#00A884] rounded-lg flex flex-col items-center justify-center shadow-lg shadow-[#00A884]/20 overflow-hidden">
                  <span className="text-[11px] font-black text-white leading-none tracking-tighter">VS</span>
                  <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white/30 rounded-full"></div>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[20px] font-extrabold tracking-tight text-slate-900 leading-none group-hover:text-[#00A884] transition-colors duration-300">
                  VetSphere
                </span>
                <span className="text-[9px] font-black text-[#00A884]/70 uppercase tracking-[0.25em] mt-1.5 transition-all duration-300 group-hover:text-[#00A884] group-hover:translate-x-0.5">
                  Surgical Global
                </span>
              </div>
            </>
          )}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {[
            { name: t.nav.home, path: '/' },
            { name: t.nav.community, path: '/community' },
            { name: t.nav.courses, path: '/courses' },
            { name: t.nav.shop, path: '/shop' },
            { name: t.nav.ai, path: '/ai' },
          ].map((item) => (
            <Link
              key={item.path}
              href={localePath(item.path)}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                isActive(item.path) ? 'text-[#00A884]' : 'text-slate-500 hover:text-[#00A884] hover:bg-emerald-50'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 text-slate-600"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Actions */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Language Selector - Only show for INTL version with multiple locales */}
          {!isCN && locales.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-[#00A884] transition-colors flex items-center gap-1.5 py-2 px-1"
              >
                {language === 'zh' ? 'CN' : language.toUpperCase()}
                <svg className={`w-3 h-3 transition-transform duration-300 ${isLangOpen ? 'rotate-180 text-[#00A884]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isLangOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsLangOpen(false)}></div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-24 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-1 z-50">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-t border-l border-slate-100"></div>
                    {locales.map(lang => (
                      <button
                        key={lang}
                        onClick={() => { setLanguage(lang); setIsLangOpen(false); }}
                        className={`w-full text-center px-3 py-3 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors relative z-10 ${language === lang ? 'text-[#00A884] bg-[#00A884]/5' : 'text-slate-400'}`}
                      >
                        {lang === 'zh' ? '\u4E2D\u6587' : lang === 'en' ? 'English' : '\u0E44\u0E17\u0E22'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <Link href={localePath('/checkout')} className="relative p-2 text-slate-500 hover:text-[#00A884] transition-colors">
            <span className="text-xl" role="img" aria-label="cart">&#x1F6D2;</span>
            {cart.length > 0 && (
              <span className="absolute top-0 right-0 bg-[#00A884] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="py-1.5 pl-1.5 pr-4 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-[#00A884] transition-colors flex items-center gap-2.5"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
                    {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                {user?.name || user?.email?.split('@')[0]}
                <svg className={`w-3 h-3 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-1.5 z-50">
                    {/* User info header */}
                    <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 border-b border-slate-100">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-vs to-emerald-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                          {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{user?.name || user?.email?.split('@')[0]}</p>
                        <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                    {user?.role === 'Doctor' && (
                      <Link href={localePath('/user')} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        👤 {t.userCenter.userCenter}
                      </Link>
                    )}
                    {user?.role === 'Admin' && (
                      <Link href={localePath('/dashboard')} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        🛡️ {isCN ? '管理后台' : (language === 'zh' ? '管理后台' : 'Admin Dashboard')}
                      </Link>
                    )}
                    {user?.role === 'ShopSupplier' && (
                      <Link href={localePath('/dashboard')} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        📦 {isCN ? '供应商后台' : (language === 'zh' ? '供应商后台' : 'Supplier Console')}
                      </Link>
                    )}
                    {user?.role === 'CourseProvider' && (
                      <Link href={localePath('/dashboard')} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        🎓 {isCN ? '教学中心' : (language === 'zh' ? '教学中心' : 'Teaching Center')}
                      </Link>
                    )}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button 
                        onClick={() => { logout(); setIsUserMenuOpen(false); }} 
                        className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {t.userCenter.signOut}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href={localePath('/auth')}
              className="py-2.5 px-6 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-[#00A884] transition-colors"
            >
              {t.nav.login}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden bg-white border-t border-slate-100 shadow-lg transition-all duration-300 overflow-hidden ${
        isMobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 border-t-0 shadow-none'
      }`}>
        <div className="px-4 py-4 space-y-2">
            {[
              { name: t.nav.home, path: '/' },
              { name: t.nav.community, path: '/community' },
              { name: t.nav.courses, path: '/courses' },
              { name: t.nav.shop, path: '/shop' },
              { name: t.nav.ai, path: '/ai' },
            ].map((item) => (
              <Link
                key={item.path}
                href={localePath(item.path)}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-bold ${
                  isActive(item.path) ? 'text-[#00A884] bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <Link href={localePath('/checkout')} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-slate-500 rounded-lg hover:bg-slate-50">
                <span className="text-xl">&#x1F6D2;</span>
                {cart.length > 0 && <span className="text-xs font-bold">({cart.length})</span>}
              </Link>
              {isAuthenticated ? (
                <>
                  {user?.role === 'Doctor' && (
                    <Link href={localePath('/user')} onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                      👤 {t.userCenter.userCenter}
                    </Link>
                  )}
                  {user?.role !== 'Doctor' && (
                    <Link href={localePath('/dashboard')} onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                      {user?.role === 'Admin' ? '🛡️' : user?.role === 'ShopSupplier' ? '📦' : '🎓'} {t.nav.dashboard}
                    </Link>
                  )}
                  <button 
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }} 
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50"
                  >
                    {t.userCenter.signOut}
                  </button>
                </>
              ) : (
                <Link
                  href={localePath('/auth')}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2.5 px-6 rounded-xl text-sm font-bold bg-slate-900 text-white text-center"
                >
                  {t.nav.login}
                </Link>
              )}
            </div>
          </div>
        </div>
    </nav>
  );
};

export default Navbar;
