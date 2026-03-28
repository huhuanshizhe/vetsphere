'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import {
  ShoppingCart,
  Menu,
  X,
  ShoppingBag,
  GraduationCap,
  Building2,
  Hospital,
} from 'lucide-react';

export function IntlNavbar() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { cart, itemCount } = useCart();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const authHref = `/${language}/auth?redirect=${encodeURIComponent(pathname)}`;

  const t = {
    zh: {
      training: '培训',
      equipment: '设备',
      forClinics: '诊所',
      about: '关于',
      signIn: '登录',
    },
    en: {
      training: 'Training',
      equipment: 'Equipment',
      forClinics: 'For Clinics',
      about: 'About',
      signIn: 'Sign In',
    },
    th: {
      training: 'การฝึกอบรม',
      equipment: 'อุปกรณ์',
      forClinics: 'สำหรับคลินิก',
      about: 'เกี่ยวกับเรา',
      signIn: 'เข้าสู่ระบบ',
    },
    ja: {
      training: 'トレーニング',
      equipment: '機器',
      forClinics: 'クリニック向け',
      about: '会社概要',
      signIn: 'ログイン',
    },
  };

  const navigation = [
    { name: t[language].training, href: `/${language}/courses`, icon: GraduationCap },
    { name: t[language].equipment, href: `/${language}/shop`, icon: ShoppingBag },
    { name: t[language].forClinics, href: `/${language}/for-clinics`, icon: Hospital },
    { name: t[language].about, href: `/${language}/about`, icon: Building2 },
  ];

  return (
    <>
      {/* Brand green navigation bar - white text */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#00A884] shadow-sm">
        <nav className="container mx-auto flex items-center justify-between py-4 px-4 lg:px-8">
          {/* Logo - White text for visibility on green background */}
          <Link href={`/${language}`} className="flex items-center gap-2 group">
            <div className="relative w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-[#00A884] font-black text-lg leading-none">VS</span>
            </div>
            <span className="font-bold text-xl text-white hidden sm:block">
              VetSphere
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:bg-white/20 transition-colors duration-200 font-medium"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href={`/${language}/cart`}
              className="relative p-2 text-white hover:text-emerald-100 transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-emerald-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
            {!isAuthenticated && (
              <Link href={authHref} className="py-2.5 px-6 rounded-xl text-sm font-bold text-white bg-white/20 hover:bg-white/30 transition-colors hover:shadow-lg">
                {t[language].signIn}
              </Link>
            )}
          </div>

          {/* Mobile Menu Button - Touch optimized */}
          <button
            type="button"
            className="lg:hidden min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-all touch-manipulation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </nav>

        {/* Mobile Menu - Enhanced with animations */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white/95 backdrop-blur-md border-b border-slate-100 animate-slide-down">
            <div className="px-4 py-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-900 hover:bg-slate-50 hover:text-emerald-700 active:bg-slate-100 transition-all touch-manipulation font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-slate-100">
                {!isAuthenticated && (
                  <Link
                    href={authHref}
                    className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-bold bg-[#00A884] text-white hover:bg-[#008F70] active:scale-[0.98] transition-all shadow-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t[language].signIn}
                  </Link>
                )}
                <Link
                  href={`/${language}/cart`}
                  className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-all mt-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Cart {itemCount > 0 && `(${itemCount})`}</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
