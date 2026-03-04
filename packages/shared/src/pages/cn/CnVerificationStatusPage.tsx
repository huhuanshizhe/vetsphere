'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, CheckCircle, XCircle, AlertCircle, FileText,
  ArrowRight, ArrowLeft, Sparkles, RefreshCw, Home, MessageCircle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../services/supabase';

interface VerificationStatus {
  id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  verificationType: string;
  realName: string;
  organizationName: string;
  positionTitle: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectReason?: string;
  approvedLevel?: string;
}

const statusConfig = {
  draft: {
    icon: FileText,
    color: 'slate',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    title: '草稿',
    description: '您的认证申请尚未提交',
  },
  submitted: {
    icon: Clock,
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    title: '待审核',
    description: '您的认证申请已提交，正在等待审核',
  },
  under_review: {
    icon: RefreshCw,
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-600',
    title: '审核中',
    description: '工作人员正在审核您的认证材料',
  },
  approved: {
    icon: CheckCircle,
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
    title: '认证通过',
    description: '恭喜！您已成为认证专业用户',
  },
  rejected: {
    icon: XCircle,
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    title: '未通过',
    description: '您的认证申请未通过审核',
  },
};

const CnVerificationStatusPage: React.FC = () => {
  const { locale } = useLanguage();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [verification, setVerification] = useState<VerificationStatus | null>(null);

  // Fetch verification status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push(`/${locale}/auth`);
          return;
        }

        const res = await fetch('/api/user/verification', {
          method: 'GET',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            router.push(`/${locale}/auth`);
            return;
          }
          setError('加载失败，请刷新重试');
          setIsLoading(false);
          return;
        }
        
        const data = await res.json();
        
        if (!data.hasVerification || !data.verification) {
          // No verification application, redirect to apply
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
    
    fetchStatus();
  }, [locale, router]);

  // Refresh status
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/user/verification', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.hasVerification && data.verification) {
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
        }
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

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
            <button
              onClick={() => router.push(`/${locale}`)}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              返回首页
            </button>
            <button
              onClick={handleRefresh}
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              重试
            </button>
          </div>
        </div>
      </main>
    );
  }

  const config = statusConfig[verification.status];
  const StatusIcon = config.icon;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pt-24 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/${locale}`)}
          className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回首页</span>
        </button>

        {/* Status Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Status Header */}
          <div className={`${config.bgColor} p-8 text-center`}>
            <div className={`w-20 h-20 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white`}>
              <StatusIcon className={`w-10 h-10 ${config.textColor}`} />
            </div>
            <h1 className={`text-2xl font-black ${config.textColor} mb-2`}>
              {config.title}
            </h1>
            <p className="text-slate-600">
              {config.description}
            </p>
          </div>

          {/* Status Content */}
          <div className="p-8 space-y-6">
            {/* Application Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase">申请信息</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">申请人</p>
                  <p className="font-bold text-slate-900">{verification.realName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">单位</p>
                  <p className="font-bold text-slate-900">{verification.organizationName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">职位</p>
                  <p className="font-bold text-slate-900">{verification.positionTitle}</p>
                </div>
                {verification.submittedAt && (
                  <div>
                    <p className="text-sm text-slate-500">提交时间</p>
                    <p className="font-bold text-slate-900">
                      {new Date(verification.submittedAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Reason */}
            {verification.status === 'rejected' && verification.rejectReason && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  未通过原因
                </h4>
                <p className="text-sm text-red-700">{verification.rejectReason}</p>
              </div>
            )}

            {/* Approved Info */}
            {verification.status === 'approved' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  认证权益
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>- 专属认证标识</li>
                  <li>- 解锁全部专业课程</li>
                  <li>- 参与专业社区讨论</li>
                  <li>- 优先获得职业机会</li>
                </ul>
              </div>
            )}

            {/* Pending Info */}
            {['submitted', 'under_review'].includes(verification.status) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  审核说明
                </h4>
                <p className="text-sm text-blue-700">
                  审核通常需要1-3个工作日，请耐心等待。审核结果将通过站内消息通知您。
                </p>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase">进度</h3>
              
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-3 top-6 bottom-6 w-0.5 bg-slate-200"></div>
                
                {/* Steps */}
                <div className="space-y-6">
                  {/* Submitted */}
                  <div className="flex items-start gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                      verification.submittedAt ? 'bg-green-500' : 'bg-slate-200'
                    }`}>
                      {verification.submittedAt && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">提交申请</p>
                      <p className="text-sm text-slate-500">
                        {verification.submittedAt 
                          ? new Date(verification.submittedAt).toLocaleString('zh-CN')
                          : '尚未提交'}
                      </p>
                    </div>
                  </div>

                  {/* Under Review */}
                  <div className="flex items-start gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                      ['under_review', 'approved', 'rejected'].includes(verification.status)
                        ? 'bg-green-500' 
                        : 'bg-slate-200'
                    }`}>
                      {['under_review', 'approved', 'rejected'].includes(verification.status) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">审核中</p>
                      <p className="text-sm text-slate-500">
                        {['under_review', 'approved', 'rejected'].includes(verification.status)
                          ? '工作人员已开始审核'
                          : '等待审核'}
                      </p>
                    </div>
                  </div>

                  {/* Result */}
                  <div className="flex items-start gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                      verification.status === 'approved' 
                        ? 'bg-green-500' 
                        : verification.status === 'rejected'
                          ? 'bg-red-500'
                          : 'bg-slate-200'
                    }`}>
                      {verification.status === 'approved' && <Check className="w-4 h-4 text-white" />}
                      {verification.status === 'rejected' && <XCircle className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">审核结果</p>
                      <p className="text-sm text-slate-500">
                        {verification.status === 'approved' && '认证通过'}
                        {verification.status === 'rejected' && '审核未通过'}
                        {!['approved', 'rejected'].includes(verification.status) && '等待结果'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-8 pt-0 space-y-4">
            {/* Draft or Rejected - Can edit and resubmit */}
            {['draft', 'rejected'].includes(verification.status) && (
              <Link
                href={`/${locale}/verification/apply`}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <span>{verification.status === 'draft' ? '继续编辑' : '修改并重新提交'}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}

            {/* Pending - Refresh */}
            {['submitted', 'under_review'].includes(verification.status) && (
              <button
                onClick={handleRefresh}
                className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span>刷新状态</span>
              </button>
            )}

            {/* Approved - Go home */}
            {verification.status === 'approved' && (
              <Link
                href={`/${locale}`}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                <span>开始使用</span>
              </Link>
            )}

            {/* Contact Support */}
            <button
              type="button"
              className="w-full py-3 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">联系客服</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

// Check icon component
const Check: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

export default CnVerificationStatusPage;
