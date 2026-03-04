'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  X,
  TrendingUp,
  BookOpen,
  Stethoscope,
  Briefcase,
  Users,
  LogOut,
  User,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface CnNavbarProps {
  locale: string;
}

export function CnNavbar({ locale }: CnNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, user, logout, canAccessDoctorWorkspace, doctorPrivilegeStatus } = useAuth();

  // 避免 SSR 水合不匹配：等待客户端挂载后再渲染认证状态相关的 UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // 双轨制：只有认证通过的医生才显示医生工作台入口
  const showDoctorWorkspace = canAccessDoctorWorkspace;
  
  // 是否显示医生认证入口（医生身份但未认证通过）
  const isDoctor = user?.identityGroupV2 === 'doctor';
  const showVerificationEntry = isDoctor && !canAccessDoctorWorkspace;

  // Main navigation: doctor-first, action-oriented (5 items)
  const navigation = [
    { name: '成长体系', href: `/${locale}/growth-system`, icon: TrendingUp },
    { name: '课程中心', href: `/${locale}/courses`, icon: BookOpen },
    { name: '临床工具', href: `/${locale}/clinical-tools`, icon: Stethoscope },
    { name: '事业发展', href: `/${locale}/career-development`, icon: Briefcase },
    { name: '医生社区', href: `/${locale}/community-intro`, icon: Users },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-lg border-b border-slate-100 shadow-sm shadow-slate-100/50">
      <nav className="max-w-7xl mx-auto flex items-center justify-between py-3 px-4 lg:px-8">
        {/* Logo = Home Link */}
        <Link href={`/${locale}`} className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-vetsphere.png" alt="宠医界" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#1a6e4e] leading-none group-hover:text-[#00A884] transition-colors duration-300">
            宠医界
          </span>
        </Link>

        {/* Desktop Navigation - Main 5 items */}
        <div className="hidden xl:flex items-center gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="px-3.5 py-2 rounded-lg text-[13px] font-bold text-slate-600 hover:text-[#00A884] hover:bg-emerald-50 transition-all"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Desktop Actions - Right side */}
        <div className="hidden xl:flex items-center gap-3">
          {/* About Platform - lightweight text link */}
          <Link
            href={`/${locale}/about`}
            className="px-3 py-2 text-[13px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            关于平台
          </Link>
          
          {mounted && isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="py-1.5 pl-1.5 pr-4 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-[#00A884] transition-colors flex items-center gap-2.5"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
                    {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                {user.name || user.email?.split('@')[0]}
                <svg className={`w-3 h-3 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-1.5 z-50">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 border-b border-slate-100">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
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
                    {/* Doctor: Personal center */}
                    {showDoctorWorkspace && (
                      <>
                        <Link href={`/${locale}/doctor`} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                          <Stethoscope className="w-4 h-4 inline mr-2" />医生工作台
                        </Link>
                        <Link href={`/${locale}/user`} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                          <User className="w-4 h-4 inline mr-2" />个人中心
                        </Link>
                      </>
                    )}
                    {!showDoctorWorkspace && isAuthenticated && (
                      <>
                        <Link href={`/${locale}/user`} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                          <User className="w-4 h-4 inline mr-2" />个人中心
                        </Link>
                        {showVerificationEntry && (
                          <Link href={`/${locale}/verification/apply`} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
                            <ShieldCheck className="w-4 h-4 inline mr-2" />
                            {doctorPrivilegeStatus === 'pending_review' ? '认证审核中' : 
                             doctorPrivilegeStatus === 'rejected' ? '重新认证' : '医生身份认证'}
                          </Link>
                        )}
                      </>
                    )}
                    {user.role === 'Admin' && (
                      <Link href={`/${locale}/dashboard`} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        管理后台
                      </Link>
                    )}
                    {user.role === 'ShopSupplier' && (
                      <Link href={`/${locale}/dashboard`} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        供应商后台
                      </Link>
                    )}
                    {user.role === 'CourseProvider' && (
                      <Link href={`/${locale}/dashboard`} onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        教学中心
                      </Link>
                    )}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => { logout(); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 inline mr-2" />退出登录
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/auth`}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                登录
              </Link>
              <Link
                href={`/${locale}/auth`}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-[#00A884] text-white hover:bg-[#009474] transition-colors shadow-sm"
              >
                立即加入
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="xl:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <div className={`xl:hidden bg-white border-t border-slate-100 shadow-lg transition-all duration-300 overflow-hidden ${
        mobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 border-t-0 shadow-none'
      }`}>
        <div className="px-4 py-4 space-y-1">
          {/* Main navigation - same 5 items */}
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-[#00A884] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className="w-5 h-5 text-slate-400" />
                {item.name}
              </Link>
            );
          })}

          {/* About Platform - secondary */}
          <Link
            href={`/${locale}/about`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Info className="w-5 h-5" />
            关于平台
          </Link>

          {/* Auth section */}
          <div className="pt-3 border-t border-slate-100 space-y-1">
            {mounted && isAuthenticated && user ? (
              <>
                {showDoctorWorkspace && (
                  <>
                    <Link href={`/${locale}/doctor`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                      <Stethoscope className="w-5 h-5 text-slate-400" />医生工作台
                    </Link>
                    <Link href={`/${locale}/user`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                      <User className="w-5 h-5 text-slate-400" />个人中心
                    </Link>
                  </>
                )}
                {!showDoctorWorkspace && (
                  <>
                    <Link href={`/${locale}/user`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                      <User className="w-5 h-5 text-slate-400" />个人中心
                    </Link>
                    {showVerificationEntry && (
                      <Link href={`/${locale}/verification/apply`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-emerald-600 hover:bg-emerald-50">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        {doctorPrivilegeStatus === 'pending_review' ? '认证审核中' : 
                         doctorPrivilegeStatus === 'rejected' ? '重新认证' : '医生身份认证'}
                      </Link>
                    )}
                  </>
                )}
                {user.role === 'Admin' && (
                  <Link href={`/${locale}/dashboard`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                    管理后台
                  </Link>
                )}
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />退出登录
                </button>
              </>
            ) : (
              <div className="flex gap-2 px-4 pt-2">
                <Link
                  href={`/${locale}/auth`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-3 text-center rounded-xl text-sm font-bold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  登录
                </Link>
                <Link
                  href={`/${locale}/auth`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-3 text-center rounded-xl text-sm font-bold bg-[#00A884] text-white"
                >
                  立即加入
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
