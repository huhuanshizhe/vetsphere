'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2,
  Sparkles, GraduationCap, Users, Award, Shield, Phone
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const CnAuthPage: React.FC = () => {
  const { locale } = useLanguage();
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    agreeTerms: false,
  });
  const [error, setError] = useState('');

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push(`/${locale}/doctor`);
    }
  }, [isAuthenticated, locale, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!isLogin && !formData.agreeTerms) {
        setError('请先同意用户协议和隐私政策');
        setIsSubmitting(false);
        return;
      }
      
      // Demo login - in production, this would call actual auth API
      const demoUser = {
        id: 'demo-user',
        email: formData.email,
        name: formData.name || formData.email.split('@')[0],
        role: 'Doctor' as const,
        points: 0,
        level: 'Resident',
      };
      login(demoUser);
      router.push(`/${locale}/doctor`);
    } catch (err: any) {
      setError(err.message || '操作失败，请稍后重试');
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
            {isLogin ? '欢迎回来' : '加入 VetSphere'}
          </h1>
          
          <p className="text-xl text-slate-600 mb-10 leading-relaxed">
            {isLogin 
              ? '登录您的账户，继续您的学习和成长之旅。'
              : '创建账户，开启专业成长之路，与数千名兽医同行一起进步。'
            }
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
          {/* Toggle */}
          <div className="flex bg-slate-100 rounded-2xl p-1.5 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                isLogin 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                !isLogin 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              注册
            </button>
          </div>

          {/* Mobile Header */}
          <div className="lg:hidden mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              {isLogin ? '登录账户' : '创建账户'}
            </h2>
            <p className="text-slate-500">
              {isLogin ? '输入您的账户信息' : '填写以下信息完成注册'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">姓名</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="请输入您的姓名"
                    required={!isLogin}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="请输入邮箱地址"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Phone (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">手机号 <span className="text-slate-400 font-normal">(选填)</span></label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="请输入手机号"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={isLogin ? '请输入密码' : '设置密码 (至少8位)'}
                  required
                  minLength={8}
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

            {/* Terms (Register only) */}
            {!isLogin && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  id="agreeTerms"
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="agreeTerms" className="text-sm text-slate-600">
                  我已阅读并同意{' '}
                  <Link href={`/${locale}/terms`} className="text-blue-600 hover:underline">用户协议</Link>
                  {' '}和{' '}
                  <Link href={`/${locale}/privacy`} className="text-blue-600 hover:underline">隐私政策</Link>
                </label>
              </div>
            )}

            {/* Forgot Password (Login only) */}
            {isLogin && (
              <div className="text-right">
                <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  忘记密码？
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>处理中...</span>
              ) : (
                <>
                  <span>{isLogin ? '登录' : '注册'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

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
            <button className="w-full py-3.5 bg-[#07C160] text-white rounded-xl font-bold hover:bg-[#06AD56] transition-colors flex items-center justify-center gap-2">
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
