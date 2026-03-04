'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Phone, MessageSquare, Check
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

type PageMode = 'reset' | 'set';
type Step = 'verify' | 'password' | 'success';

// SMS button states
type SmsButtonState = 'idle' | 'sending' | 'countdown' | 'resend';

const CnSetPasswordPage: React.FC = () => {
  const { locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Page mode: 'reset' for forgot password, 'set' for setting new password
  const mode: PageMode = (searchParams.get('mode') as PageMode) || 'set';
  
  // Current step
  const [step, setStep] = useState<Step>(mode === 'reset' ? 'verify' : 'password');
  
  // Form state
  const [mobile, setMobile] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [smsButtonState, setSmsButtonState] = useState<SmsButtonState>('idle');
  const [countdown, setCountdown] = useState(0);
  const [requireRelogin, setRequireRelogin] = useState(false);

  // Validate mobile format
  const isValidMobile = (m: string): boolean => {
    return /^1[3-9]\d{9}$/.test(m);
  };

  // Validate password strength
  const isValidPassword = (p: string): boolean => {
    return p.length >= 8 && p.length <= 32;
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
      
      setCountdown(60);
      setSmsButtonState('countdown');
      
      // Dev mode: show code in console
      if (data.code) {
        console.log('[DEV] SMS Code:', data.code);
      }
    } catch {
      setError('网络错误，请检查您的网络连接');
      setSmsButtonState('idle');
    }
  };

  // Verify SMS code and proceed
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidMobile(mobile)) {
      setError('请输入正确的手机号');
      return;
    }
    
    if (!/^\d{6}$/.test(smsCode)) {
      setError('请输入6位验证码');
      return;
    }
    
    setError('');
    // Move to password step (verification happens on final submit)
    setStep('password');
  };

  // Submit new password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPassword(password)) {
      setError('密码需要8-32位');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode,
          mobile: mode === 'reset' ? mobile : undefined,
          code: mode === 'reset' ? smsCode : undefined,
          newPassword: password,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || '设置密码失败，请重试');
        setIsSubmitting(false);
        // If code is invalid, go back to verify step
        if (mode === 'reset' && data.error?.includes('验证码')) {
          setStep('verify');
        }
        return;
      }
      
      setRequireRelogin(data.requireRelogin || false);
      setStep('success');
    } catch {
      setError('网络错误，请检查您的网络连接');
      setIsSubmitting(false);
    }
  };

  // Get SMS button text
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

  // Handle continue from success
  const handleContinue = () => {
    if (requireRelogin) {
      router.push(`/${locale}/auth`);
    } else {
      router.push(`/${locale}`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center py-24 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 md:p-10">
          {/* Header */}
          <div className="mb-8">
            {step !== 'success' && (
              <button
                onClick={() => {
                  if (step === 'password' && mode === 'reset') {
                    setStep('verify');
                  } else {
                    router.back();
                  }
                }}
                className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">返回</span>
              </button>
            )}
            
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              {step === 'success' 
                ? '密码设置成功' 
                : mode === 'reset' 
                  ? '找回密码' 
                  : '设置密码'}
            </h1>
            <p className="text-slate-500">
              {step === 'verify' && '请验证您的手机号'}
              {step === 'password' && '请设置新密码（8-32位）'}
              {step === 'success' && (requireRelogin ? '请使用新密码重新登录' : '您现在可以使用密码登录了')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Verify Step */}
          {step === 'verify' && (
            <form onSubmit={handleVerifySubmit} className="space-y-5">
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

              {/* Submit */}
              <button
                type="submit"
                disabled={!isValidMobile(mobile) || !/^\d{6}$/.test(smsCode)}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>下一步</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">新密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入新密码 (8-32位)"
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

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <p className="text-sm text-slate-500 font-medium">密码要求：</p>
                <div className="flex items-center gap-2">
                  <Check className={`w-4 h-4 ${password.length >= 8 ? 'text-green-500' : 'text-slate-300'}`} />
                  <span className={`text-sm ${password.length >= 8 ? 'text-green-600' : 'text-slate-400'}`}>
                    至少8位字符
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className={`w-4 h-4 ${password.length <= 32 && password.length > 0 ? 'text-green-500' : 'text-slate-300'}`} />
                  <span className={`text-sm ${password.length <= 32 && password.length > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                    不超过32位字符
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className={`w-4 h-4 ${password && password === confirmPassword ? 'text-green-500' : 'text-slate-300'}`} />
                  <span className={`text-sm ${password && password === confirmPassword ? 'text-green-600' : 'text-slate-400'}`}>
                    两次密码一致
                  </span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || !isValidPassword(password) || password !== confirmPassword}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>提交中...</span>
                ) : (
                  <>
                    <span>确认设置</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              
              <p className="text-slate-600">
                {requireRelogin 
                  ? '密码已重置成功，请使用新密码登录' 
                  : '密码设置成功，您现在可以使用密码快速登录了'}
              </p>

              <button
                onClick={handleContinue}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <span>{requireRelogin ? '去登录' : '完成'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Back to Login Link */}
          {step !== 'success' && (
            <div className="mt-8 text-center">
              <Link 
                href={`/${locale}/auth`}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                返回登录
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default CnSetPasswordPage;
