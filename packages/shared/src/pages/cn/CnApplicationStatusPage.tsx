'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight,
  RefreshCw, GraduationCap, Users, Edit3, Loader2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { DoctorApplication } from '../../types';

const CnApplicationStatusPage: React.FC = () => {
  const { locale } = useLanguage();
  const { user, isAuthenticated, loading: authLoading, applicationStatus, refreshApplicationStatus } = useAuth();
  const router = useRouter();
  
  const [application, setApplication] = useState<DoctorApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 获取 access token
  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // 加载申请详情
  const loadApplication = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const token = await getAccessToken();
      if (!token) return;
      
      const response = await fetch('/api/doctor-application', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setApplication(data.application);
      }
    } catch (err) {
      console.error('Load application error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // 初始化
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push(`/${locale}/auth?redirect=/${locale}/register/status`);
      return;
    }
    
    loadApplication();
  }, [authLoading, isAuthenticated, router, locale, loadApplication]);

  // 刷新状态
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshApplicationStatus();
    await loadApplication();
    setIsRefreshing(false);
  };

  // 渲染待审核状态
  const renderPendingReview = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Clock className="w-10 h-10 text-amber-500" />
      </div>
      
      <h2 className="text-2xl font-black text-slate-900 mb-3">资料已提交，审核中</h2>
      <p className="text-slate-500 mb-6">
        您的申请已于 {application?.submittedAt ? new Date(application.submittedAt).toLocaleString('zh-CN') : '刚才'} 提交
      </p>
      
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8 text-left">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">审核说明</p>
            <ul className="space-y-1 text-amber-700">
              <li>通常 1-2 个工作日完成审核</li>
              <li>审核结果将通过短信或邮件通知</li>
              <li>如有问题，工作人员会与您联系</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          刷新状态
        </button>
        <Link
          href={`/${locale}/courses`}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
        >
          <GraduationCap className="w-4 h-4" />
          浏览课程
        </Link>
      </div>
    </div>
  );

  // 渲染已拒绝状态
  const renderRejected = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <XCircle className="w-10 h-10 text-red-500" />
      </div>
      
      <h2 className="text-2xl font-black text-slate-900 mb-3">审核未通过</h2>
      <p className="text-slate-500 mb-6">您的申请未能通过审核，请查看原因并修改后重新提交</p>
      
      {/* 拒绝原因 */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8 text-left">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 mb-1">拒绝原因</p>
            <p className="text-sm text-red-700">
              {application?.rejectionReason || '未提供具体原因，请联系客服了解详情'}
            </p>
          </div>
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={`/${locale}/register/doctor`}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
        >
          <Edit3 className="w-4 h-4" />
          修改资料并重新提交
        </Link>
      </div>
    </div>
  );

  // 渲染已通过状态
  const renderApproved = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>
      
      <h2 className="text-2xl font-black text-slate-900 mb-3">恭喜，审核已通过！</h2>
      <p className="text-slate-500 mb-6">
        欢迎加入 VetSphere 医生社区，现在您可以使用医生工作台的全部功能
      </p>
      
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-8">
        <div className="flex items-center justify-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">您的医生身份已认证</span>
        </div>
      </div>
      
      {/* 功能入口 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href={`/${locale}/doctor`}
          className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-800 group-hover:text-blue-600">医生工作台</h3>
              <p className="text-sm text-slate-500">管理咨询、病历、社区</p>
            </div>
          </div>
        </Link>
        
        <Link
          href={`/${locale}/courses`}
          className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-800 group-hover:text-purple-600">课程中心</h3>
              <p className="text-sm text-slate-500">专业培训课程</p>
            </div>
          </div>
        </Link>
      </div>
      
      {/* 主操作按钮 */}
      <Link
        href={`/${locale}/doctor`}
        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
      >
        进入工作台
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );

  // 渲染草稿状态（未提交）
  const renderDraft = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Edit3 className="w-10 h-10 text-slate-400" />
      </div>
      
      <h2 className="text-2xl font-black text-slate-900 mb-3">申请尚未提交</h2>
      <p className="text-slate-500 mb-6">您有一份未完成的申请，请继续填写并提交审核</p>
      
      <Link
        href={`/${locale}/register/doctor`}
        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
      >
        继续填写申请
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );

  // 渲染无申请状态
  const renderNoApplication = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Users className="w-10 h-10 text-slate-400" />
      </div>
      
      <h2 className="text-2xl font-black text-slate-900 mb-3">尚未提交申请</h2>
      <p className="text-slate-500 mb-6">欢迎加入 VetSphere 医生社区，请完成入驻申请</p>
      
      <Link
        href={`/${locale}/register/doctor`}
        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
      >
        开始申请
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );

  // 加载中
  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* 卡片 */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {/* 根据状态渲染不同内容 */}
          {!application && renderNoApplication()}
          {application?.status === 'draft' && renderDraft()}
          {application?.status === 'pending_review' && renderPendingReview()}
          {application?.status === 'rejected' && renderRejected()}
          {application?.status === 'approved' && renderApproved()}
        </div>
        
        {/* 返回首页 */}
        <div className="text-center mt-6">
          <Link
            href={`/${locale}`}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
};

export default CnApplicationStatusPage;
