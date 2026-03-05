'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useSiteConfig } from '../../context/SiteConfigContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Menu,
  X,
  TrendingUp,
  GraduationCap,
  ShoppingBag,
  Building2,
  Hospital,
  User,
  LogOut,
  Globe,
  ChevronDown,
} from 'lucide-react';

// Navigation translations
const navTranslations = {
  en: {
    upgrade: 'Upgrade',
    training: 'Training',
    equipment: 'Equipment',
    forClinics: 'For Clinics',
    about: 'About',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    userCenter: 'My Account',
    adminDashboard: 'Admin Dashboard',
    supplierConsole: 'Supplier Console',
    teachingCenter: 'Teaching Center',
  },
  th: {
    upgrade: 'อัปเกรด',
    training: 'การฝึกอบรม',
    equipment: 'อุปกรณ์',
    forClinics: 'สำหรับคลินิก',
    about: 'เกี่ยวกับเรา',
    signIn: 'เข้าสู่ระบบ',
    signOut: 'ออกจากระบบ',
    userCenter: 'บัญชีของฉัน',
    adminDashboard: 'แดชบอร์ดผู้ดูแล',
    supplierConsole: 'คอนโซลซัพพลายเออร์',
    teachingCenter: 'ศูนย์การสอน',
  },
  ja: {
    upgrade: 'アップグレード',
    training: 'トレーニング',
    equipment: '機器',
    forClinics: 'クリニック向け',
    about: '会社概要',
    signIn: 'ログイン',
    signOut: 'ログアウト',
    userCenter: 'マイアカウント',
    adminDashboard: '管理ダッシュボード',
    supplierConsole: 'サプライヤーコンソール',
    teachingCenter: 'ティーチングセンター',
  },
};

const languageNames: Record<string, string> = {
  en: 'English',
  th: 'ภาษาไทย',
  ja: '日本語',
};

interface IntlNavbarProps {
  locale: string;
}

export function IntlNavbar({ locale }: IntlNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { siteConfig } = useSiteConfig();
  const { isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();

  const authHref = `/${locale}/auth?redirect=${encodeURIComponent(pathname)}`;
  const t = navTranslations[language as keyof typeof navTranslations] || navTranslations.en;

  const navigation = [
    { name: t.training, href: `/${locale}/courses`, icon: GraduationCap },
    { name: t.equipment, href: `/${locale}/shop`, icon: ShoppingBag },
    { name: t.forClinics, href: `/${locale}/for-clinics`, icon: Hospital },
    { name: t.about, href: `/${locale}/about`, icon: Building2 },
  ];

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang as any);
    // Update URL with new locale
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    if (pathParts[1] && siteConfig.locales.includes(pathParts[1] as any)) {
      pathParts[1] = newLang;
      window.location.href = pathParts.join('/');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50">
      <nav className="container mx-auto flex items-center justify-between py-4 px-4 lg:px-8">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-3.5 group relative flex-shrink-0">
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
            <span className="text-[9px] font-black text-[#00A884]/70 uppercase tracking-[0.25em] mt-1.5 transition-all duration-300 group-hover:text-[#00A884] group-hover:translate-x-0.5 hidden sm:block">
              Global Veterinary
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 font-medium"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Globe className="w-4 h-4" />
                <span>{languageNames[language] || 'English'}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {siteConfig.locales.map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={language === lang ? 'bg-muted' : ''}
                >
                  {languageNames[lang] || lang}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auth */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="py-1.5 pl-1.5 pr-4 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-[#00A884] transition-colors flex items-center gap-2.5"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
                    {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                {user.name || user.email?.split('@')[0]}
                <svg className={`w-3 h-3 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-1.5 z-50">
                    {/* User info header */}
                    <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 border-b border-slate-100">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00A884] to-emerald-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                          {user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{user.name || user.email?.split('@')[0]}</p>
                        <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    {/* Role-based menu items */}
                    {user.role === 'Doctor' && (
                      <Link href={`/${locale}/user`} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        👤 {t.userCenter}
                      </Link>
                    )}
                    {user.role === 'Admin' && (
                      <Link href={`/${locale}/dashboard`} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        🛡️ {t.adminDashboard}
                      </Link>
                    )}
                    {user.role === 'ShopSupplier' && (
                      <Link href={`/${locale}/dashboard`} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        📦 {t.supplierConsole}
                      </Link>
                    )}
                    {user.role === 'CourseProvider' && (
                      <Link href={`/${locale}/dashboard`} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        🎓 {t.teachingCenter}
                      </Link>
                    )}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => { logout(); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {t.signOut}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href={authHref}
              className="py-2.5 px-6 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-[#00A884] transition-colors"
            >
              {t.signIn}
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-background border-b border-border animate-fade-in">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}

            {/* Mobile Language Switcher */}
            <div className="pt-4 border-t border-border">
              <p className="px-4 py-2 text-sm text-muted-foreground">Language</p>
              <div className="flex flex-wrap gap-2 px-4">
                {siteConfig.locales.map((lang) => (
                  <Button
                    key={lang}
                    variant={language === lang ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      handleLanguageChange(lang);
                      setMobileMenuOpen(false);
                    }}
                  >
                    {languageNames[lang] || lang}
                  </Button>
                ))}
              </div>
            </div>

            {/* Mobile Auth */}
            <div className="pt-4 border-t border-border">
              {isAuthenticated && user ? (
                <div className="space-y-1">
                  {user.role === 'Doctor' && (
                    <Link
                      href={`/${locale}/user`}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="w-5 h-5" />
                      {t.userCenter}
                    </Link>
                  )}
                  {user.role === 'Admin' && (
                    <Link href={`/${locale}/dashboard`} className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-medium" onClick={() => setMobileMenuOpen(false)}>
                      🛡️ {t.adminDashboard}
                    </Link>
                  )}
                  {user.role === 'ShopSupplier' && (
                    <Link href={`/${locale}/dashboard`} className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-medium" onClick={() => setMobileMenuOpen(false)}>
                      📦 {t.supplierConsole}
                    </Link>
                  )}
                  {user.role === 'CourseProvider' && (
                    <Link href={`/${locale}/dashboard`} className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-medium" onClick={() => setMobileMenuOpen(false)}>
                      🎓 {t.teachingCenter}
                    </Link>
                  )}
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 font-medium"
                  >
                    <LogOut className="w-5 h-5" />
                    {t.signOut}
                  </button>
                </div>
              ) : (
                <Button variant="default" className="w-full" asChild>
                  <Link href={authHref} onClick={() => setMobileMenuOpen(false)}>
                    {t.signIn}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
