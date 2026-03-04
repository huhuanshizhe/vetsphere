'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock, Eye, EyeOff, ArrowRight,
  Sparkles, GraduationCap, Users, Award, Shield, Phone, MessageSquare
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Types for user state from /api/auth/me
interface UserState {
  isLoggedIn: boolean;
  user?: {
    id: string;
    mobile: string;
    status: string;
    displayName?: string;
    avatarUrl?: string;
    realName?: string;
    organizationName?: string;
  };
  identity?: {
    identityType?: string;
    identityGroup?: string;
    identityVerifiedFlag?: boolean;
  };
  onboarding?: {
    status: string;
    profileCompletionPercent?: number;
  };
  verification?: {
    required: boolean;
    status?: string;
    rejectReason?: string;
  };
  access?: {
    level: string;
    permissionFlags?: Record<string, boolean>;
  };
  redirectHint: string;
  accountStatusReason?: string;
}

type AuthTab = 'sms' | 'password';

// SMS button states: idle, sending, countdown, resend
type SmsButtonState = 'idle' | 'sending' | 'countdown' | 'resend';

const CnAuthPage: React.FC = () => {
  const { locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Tab state: 'sms' for SMS code login/register, 'password' for password login
  const [activeTab, setActiveTab] = useState<AuthTab>('sms');
  
  // Form state
  const [mobile, setMobile] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(false);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [smsButtonState, setSmsButtonState] = useState<SmsButtonState>('idle');
  const [countdown, setCountdown] = useState(0);

  // Validate mobile format (Chinese mobile: 1[3-9]\d{9})
  const isValidMobile = (m: string): boolean => {
    return /^1[3-9]\d{9}$/.test(m);
  };

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) {
      if (smsButtonState === 'countdown') {
        setSmsButtonState('resend');
      }
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, smsButtonState]);

  // Handle redirect based on user state
  const handleRedirect = useCallback((userState: UserState) => {
    const { redirectHint } = userState;
    const redirectParam = searchParams.get('redirect');
    
    switch (redirectHint) {
      case 'go_identity_select':
        router.push(`/${locale}/onboarding/identity`);
        break;
      case 'go_profile_complete':
        router.push(`/${locale}/onboarding/profile`);
        break;
      case 'show_verification_prompt':
        // Show prompt banner, but allow user to proceed to home
        if (redirectParam && redirectParam.startsWith('/')) {
          router.push(redirectParam);
        } else {
          router.push(`/${locale}`);
        }
        break;
      case 'show_rejection_prompt':
        router.push(`/${locale}/verification/status`);
        break;
      case 'show_verification_pending':
        router.push(`/${locale}/verification/status`);
        break;
      case 'go_account_status':
        router.push(`/${locale}/auth/account-status`);
        break;
      case 'go_home':
      default:
        if (redirectParam && redirectParam.startsWith('/')) {
          router.push(redirectParam);
        } else {
          router.push(`/${locale}`);
        }
        break;
    }
  }, [locale, router, searchParams]);

  // Fetch user state after successful login
  const fetchUserState = async (): Promise<UserState | null> => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!res.ok) {
        return null;
      }
      
      const data = await res.json();
      return data as UserState;
    } catch {
      return null;
    }
  };

  // Send SMS code
  const handleSendSmsCode = async () => {
    if (!isValidMobile(mobile)) {
      setError('请输入正确的手机号');
      return;
    }
    
    setError('');
    setSmsButtonState('sending');
    
    try {
      const res = await fetch('/api/auth/send-sms-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || '发送失败，请稍后重试');
        setSmsButtonState('idle');
        return;
      }
      
      // Start countdown (60 seconds)
      setCountdown(60);
      setSmsButtonState('countdown');
      
      // In development mode, show code in console
      if (data.code) {
        console.log('[DEV] SMS Code:', data.code);
      }
    } catch (err) {
      setError('网络错误，请检查您的网络连接');
      setSmsButtonState('idle');
    }
  };

  // SMS login/register submit
  const handleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidMobile(mobile)) {
      setError('请输入正确的手机号');
      return;
    }
    
    if (!/^\d{6}$/.test(smsCode)) {
      setError('请输入6位验证码');
      return;
    }
    
    if (!agreeTerms) {
      setError('请先同意用户协议和隐私政策');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/auth/register-or-login-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile, code: smsCode }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.error?.includes('disabled') || data.error?.includes('banned')) {
          // Account restricted
          router.push(`/${locale}/auth/account-status?reason=${encodeURIComponent(data.error)}`);
          return;
        }
        setError(data.error || '登录失败，请重试');
        setIsSubmitting(false);
        return;
      }
      
      // Login successful, redirect based on user state
      if (data.userState) {
        handleRedirect(data.userState);
      } else {
        // Fallback: fetch user state
        const userState = await fetchUserState();
        if (userState) {
          handleRedirect(userState);
        } else {
          router.push(`/${locale}`);
        }
      }
    } catch (err) {
      setError('网络错误，请检查您的网络连接');
      setIsSubmitting(false);
    }
  };

  // Password login submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidMobile(mobile)) {
      setError('请输入正确的手机号');
      return;
    }
    
    if (!password || password.length < 8) {
      setError('密码至少8位');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/auth/login-by-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.error?.includes('disabled') || data.error?.includes('banned')) {
          router.push(`/${locale}/auth/account-status?reason=${encodeURIComponent(data.error)}`);
          return;
        }
        setError(data.error || '登录失败，请检查手机号和密码');
        setIsSubmitting(false);
        return;
      }
      
      // Login successful
      if (data.userState) {
        handleRedirect(data.userState);
      } else {
        const userState = await fetchUserState();
        if (userState) {
          handleRedirect(userState);
        } else {
          router.push(`/${locale}`);
        }
      }
    } catch (err) {
      setError('网络错误，请检查您的网络连接');
      setIsSubmitting(false);
    }
  };

  // Get SMS button text based on state
  const getSmsButtonText = (): string => {
    switch (smsButtonState) {
      case 'sending':
        return '发送中...';
      case 'countdown':
        return `${countdown}s后重试`;
      case 'resend':
        return '重新发送';
      default:
        return '获取验证码';
    }
  };

  const benefits = [
    { icon: <GraduationCap className="w-5 h-5" />, text: '专业课程学习' },
    { icon: <Users className="w-5 h-5" />, text: '医生社区交流' },
    { icon: <Award className="w-5 h-5" />, text: '成长档案记录' },
    { icon: <Shield className="w-5 h-5" />, text: '职业机会推荐' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center py-24 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left - Benefits */}
        <div className="hidden lg:flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-6 w-fit">
            <Sparkles className="w-4 h-4" />
            <span>宠物医生职业发展平台</span>
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 mb-6 leading-tight">
            欢迎加入 VetSphere
          </h1>
          
          <p className="text-xl text-slate-600 mb-10 leading-relaxed">
            登录或注册账户，开启专业成长之路，与数千名兽医同行一起进步。
          </p>

          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  {benefit.icon}
                </div>
                <span className="text-lg font-bold text-slate-700">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Form */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 md:p-10">
          {/* Tab Toggle */}
          <div className="flex bg-slate-100 rounded-2xl p-1.5 mb-8">
            <button
              onClick={() => { setActiveTab('sms'); setError(''); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'sms' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              验证码登录
            </button>
            <button
              onClick={() => { setActiveTab('password'); setError(''); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'password' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Lock className="w-4 h-4" />
              密码登录
            </button>
          </div>

          {/* Mobile Header */}
          <div className="lg:hidden mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              {activeTab === 'sms' ? '手机验证码登录' : '密码登录'}
            </h2>
            <p className="text-slate-500">
              {activeTab === 'sms' 
                ? '新用户将自动注册账户' 
                : '使用手机号和密码登录'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* SMS Code Form */}
          {activeTab === 'sms' && (
            <form onSubmit={handleSmsSubmit} className="space-y-5">
              {/* Mobile */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">手机号</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="请输入手机号"
                    maxLength={11}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* SMS Code */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">验证码</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6位验证码"
                      maxLength={6}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendSmsCode}
                    disabled={!isValidMobile(mobile) || smsButtonState === 'sending' || smsButtonState === 'countdown'}
                    className={`px-5 py-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                      smsButtonState === 'countdown'
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : isValidMobile(mobile) && smsButtonState !== 'sending'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {getSmsButtonText()}
                  </button>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  id="agreeTermsSms"
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="agreeTermsSms" className="text-sm text-slate-600">
                  我已阅读并同意{' '}
                  <Link href={`/${locale}/terms`} className="text-blue-600 hover:underline">用户协议</Link>
                  {' '}和{' '}
                  <Link href={`/${locale}/privacy`} className="text-blue-600 hover:underline">隐私政策</Link>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !isValidMobile(mobile) || !/^\d{6}$/.test(smsCode) || !agreeTerms}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>登录中...</span>
                ) : (
                  <>
                    <span>立即进入</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-slate-500">
                未注册手机号将自动创建账户
              </p>
            </form>
          )}

          {/* Password Form */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              {/* Mobile */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">手机号</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="请输入手机号"
                    maxLength={11}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberLogin}
                    onChange={(e) => setRememberLogin(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">记住登录</span>
                </label>
                <Link 
                  href={`/${locale}/auth/set-password?mode=reset`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  忘记密码?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !isValidMobile(mobile) || !password}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>登录中...</span>
                ) : (
                  <>
                    <span>登录</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-slate-500">
                还没有密码？请使用验证码登录后设置
              </p>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-400">或</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <button 
              type="button"
              className="w-full py-3.5 bg-[#07C160] text-white rounded-xl font-bold hover:bg-[#06AD56] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-3.09-6.024-7.062-6.121zm-2.036 2.891c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/>
              </svg>
              <span>微信登录</span>
            </button>
          </div>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link 
              href={`/${locale}`}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CnAuthPage;
