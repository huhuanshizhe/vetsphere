'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, CheckCircle, XCircle, AlertCircle, FileText,
  ArrowRight, ArrowLeft, Sparkles, RefreshCw, Home, MessageCircle, Edit3,
  BookOpen, Stethoscope, Users, Shield, Star, ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabase, getSessionSafe } from '../../services/supabase';

interface VerificationStatus {
  id: string;
  status: string;
  verificationType: string;
  realName: string;
  organizationName: string;
  positionTitle: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectReason?: string;
  approvedLevel?: string;
}

const CnVerificationStatusPage: React.FC = () => {
  const { locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [verification, setVerification] = useState<VerificationStatus | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await getSessionSafe();
      if (!session) {
        router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const res = await fetch('/api/user/verification', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        setError('加载失败，请刷新重试');
        setIsLoading(false);
        return;
      }
      
      const data = await res.json();
      
      if (!data.hasVerification || !data.verification) {
        router.push(`/${locale}/verification/apply`);
        return;
      }
      
      setVerification({
        id: data.verification.id,
        status: data.verification.status,
        verificationType: data.verification.verificationType,
        realName: data.verification.realName,
        organizationName: data.verification.organizationName,
        positionTitle: data.verification.positionTitle,
        submittedAt: data.verification.submittedAt,
        reviewedAt: data.verification.reviewedAt,
        rejectReason: data.verification.rejectReason,
        approvedLevel: data.verification.approvedLevel,
      });
    } catch {
      setError('网络错误，请检查您的网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, [locale, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">加载中...</p>
        </div>
      </main>
    );
  }

  if (error || !verification) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center py-24 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">加载失败</h2>
          <p className="text-slate-500 mb-6">{error || '未找到认证申请'}</p>
          <div className="flex gap-4">
            <button onClick={() => router.push(`/${locale}`)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">
              返回首页
            </button>
            <button onClick={fetchStatus} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">
              重试
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 归一化状态：将旧值（如 under_review）映射到新状态
  const normalizeStatus = (status: string): string => {
    if (['submitted', 'under_review', 'pending_review'].includes(status)) return 'submitted';
    if (['approved', 'rejected', 'draft'].includes(status)) return status;
    return 'submitted'; // 未知状态按待审核处理
  };
  const displayStatus = normalizeStatus(verification.status);

  // 计算距提交已过天数
  const daysSinceSubmit = verification.submittedAt
    ? Math.floor((Date.now() - new Date(verification.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 返回按钮 */}
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回上一页</span>
        </button>

        {/* ========== 待审核状态 ========== */}
        {displayStatus === 'submitted' && (
          <div className="space-y-6">
            {/* 主状态卡片 */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <Clock className="w-10 h-10 text-blue-500" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">申请已提交，正在审核中</h1>
                <p className="text-slate-500">
                  我们已收到您的认证申请，审核团队将尽快处理
                </p>
              </div>

              {/* 申请摘要 */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-slate-400">申请人</span>
                      <span className="ml-2 font-bold text-slate-900">{verification.realName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">单位</span>
                      <span className="ml-2 font-bold text-slate-900">{verification.organizationName}</span>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    提交于 {verification.submittedAt ? new Date(verification.submittedAt).toLocaleDateString('zh-CN') : '-'}
                    {daysSinceSubmit > 0 && <span className="ml-1">({daysSinceSubmit}天前)</span>}
                  </div>
                </div>
              </div>

              {/* 进度时间线 - 3步 */}
              <div className="p-6">
                <div className="flex items-center justify-between relative">
                  {/* 连接线 */}
                  <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-slate-200">
                    <div className="h-full bg-blue-500" style={{ width: '50%' }}></div>
                  </div>

                  {/* 步骤1 - 已完成 */}
                  <div className="relative z-10 flex flex-col items-center w-1/3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                      <CheckIcon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">提交申请</p>
                    <p className="text-xs text-slate-400">已完成</p>
                  </div>

                  {/* 步骤2 - 进行中 */}
                  <div className="relative z-10 flex flex-col items-center w-1/3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-2 animate-pulse">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-blue-600">审核中</p>
                    <p className="text-xs text-blue-500">预计1-3个工作日</p>
                  </div>

                  {/* 步骤3 - 待完成 */}
                  <div className="relative z-10 flex flex-col items-center w-1/3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-400">审核通过</p>
                    <p className="text-xs text-slate-300">开通医生工作台</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 接下来会发生什么 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                接下来会发生什么？
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-black text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">资质审核</p>
                    <p className="text-sm text-slate-500">审核团队将核实您提交的资质证明和执业信息</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-black text-blue-600">2</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">结果通知</p>
                    <p className="text-sm text-slate-500">审核完成后，您可在此页面查看结果。如未通过会附说明，您可修改后重新提交</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-black text-blue-600">3</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">开通医生工作台</p>
                    <p className="text-sm text-slate-500">审核通过后，即可使用医生社区、临床工具、专业课程等全部功能</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 等待期间可以做的事 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">等待审核期间，您可以先探索</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href={`/${locale}/courses`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 transition-colors group">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">浏览课程</p>
                    <p className="text-xs text-slate-400">免费课程即刻学习</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                </Link>
                <Link href={`/${locale}/growth-system`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 transition-colors group">
                  <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">成长体系</p>
                    <p className="text-xs text-slate-400">了解职业成长路径</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 transition-colors" />
                </Link>
                <Link href={`/${locale}/community-intro`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-violet-50 transition-colors group">
                  <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">医生社区</p>
                    <p className="text-xs text-slate-400">认证后即可参与</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors" />
                </Link>
                <Link href={`/${locale}/career-development`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-amber-50 transition-colors group">
                  <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">事业发展</p>
                    <p className="text-xs text-slate-400">职业机会与资源</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-400 transition-colors" />
                </Link>
              </div>
            </div>

            {/* 操作区 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={fetchStatus}
                className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>刷新审核状态</span>
              </button>
              <Link
                href={`/${locale}`}
                className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>返回首页</span>
              </Link>
            </div>
          </div>
        )}

        {/* ========== 审核通过 ========== */}
        {displayStatus === 'approved' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-8 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">认证已通过</h1>
                <p className="text-slate-500">
                  您已成为宠医界认证医生，专业功能已全部开通
                </p>
                {verification.reviewedAt && (
                  <p className="text-xs text-slate-400 mt-2">
                    通过时间：{new Date(verification.reviewedAt).toLocaleDateString('zh-CN')}
                  </p>
                )}
              </div>

              <div className="p-6">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  已解锁的专业功能
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Stethoscope, label: '医生工作台', desc: '客户与病历管理' },
                    { icon: BookOpen, label: '专业课程', desc: '全部课程无限学习' },
                    { icon: Users, label: '医生社区', desc: '病例讨论与交流' },
                    { icon: Shield, label: '认证标识', desc: '专属认证身份展示' },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                      <Icon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{label}</p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href={`/${locale}/doctor`}
              className="block w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all text-center"
            >
              进入医生工作台
              <ArrowRight className="w-5 h-5 inline-block ml-2" />
            </Link>
          </div>
        )}

        {/* ========== 审核未通过 ========== */}
        {displayStatus === 'rejected' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 p-8 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">认证未通过</h1>
                <p className="text-slate-500">
                  您的申请未通过审核，请根据以下说明修改后重新提交
                </p>
              </div>

              {/* 驳回原因 */}
              {verification.rejectReason && (
                <div className="mx-6 mt-6 p-5 bg-red-50 border border-red-200 rounded-xl">
                  <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    未通过原因
                  </h4>
                  <p className="text-sm text-red-700 leading-relaxed">{verification.rejectReason}</p>
                </div>
              )}

              {/* 修改指引 */}
              <div className="p-6">
                <h3 className="font-bold text-slate-900 mb-4">如何重新申请？</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-black text-slate-500">1</span>
                    </div>
                    <p className="text-sm text-slate-600">仔细阅读上方未通过原因</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-black text-slate-500">2</span>
                    </div>
                    <p className="text-sm text-slate-600">点击下方按钮进入修改页面，您之前填写的信息会自动保留</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-black text-slate-500">3</span>
                    </div>
                    <p className="text-sm text-slate-600">修改完成后重新提交，可多次申请直到通过</p>
                  </div>
                </div>
              </div>

              {/* 申请摘要 */}
              <div className="px-6 pb-6">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-slate-400">申请人</span>
                        <span className="ml-2 font-bold text-slate-700">{verification.realName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">单位</span>
                        <span className="ml-2 font-bold text-slate-700">{verification.organizationName}</span>
                      </div>
                    </div>
                    {verification.reviewedAt && (
                      <span className="text-slate-400">
                        审核于 {new Date(verification.reviewedAt).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Link
              href={`/${locale}/verification/apply`}
              className="block w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-center"
            >
              <Edit3 className="w-5 h-5 inline-block mr-2" />
              修改并重新提交
              <ArrowRight className="w-5 h-5 inline-block ml-2" />
            </Link>
          </div>
        )}

        {/* ========== 草稿状态 ========== */}
        {displayStatus === 'draft' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <FileText className="w-10 h-10 text-slate-400" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">申请尚未提交</h1>
                <p className="text-slate-500">
                  您有一份未完成的认证申请草稿，继续填写并提交即可开始审核
                </p>
              </div>

              <div className="p-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    <span className="font-bold">提示：</span>
                    草稿已自动保存，您可以随时继续填写。提交后审核通常需要1-3个工作日。
                  </p>
                </div>
              </div>
            </div>

            <Link
              href={`/${locale}/verification/apply`}
              className="block w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-center"
            >
              <Edit3 className="w-5 h-5 inline-block mr-2" />
              继续填写申请
              <ArrowRight className="w-5 h-5 inline-block ml-2" />
            </Link>
          </div>
        )}

        {/* 底部辅助 */}
        <div className="mt-6 text-center">
          <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors text-sm inline-flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            遇到问题？联系客服
          </button>
        </div>
      </div>
    </main>
  );
};

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

export default CnVerificationStatusPage;
