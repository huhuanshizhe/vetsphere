'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, Ban, ShieldOff, MessageCircle, Home, ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const CnAccountStatusPage: React.FC = () => {
  const { locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const reason = searchParams.get('reason') || '';
  
  // Determine status type from reason
  const isBanned = reason.toLowerCase().includes('banned') || reason.includes('封禁');
  const isDisabled = reason.toLowerCase().includes('disabled') || reason.includes('禁用');
  
  const getStatusConfig = () => {
    if (isBanned) {
      return {
        icon: Ban,
        title: '账号已封禁',
        description: '您的账号因违反平台规定已被封禁',
        color: 'red',
        bgColor: 'bg-red-100',
        textColor: 'text-red-600',
      };
    }
    if (isDisabled) {
      return {
        icon: ShieldOff,
        title: '账号已禁用',
        description: '您的账号已被暂时禁用',
        color: 'amber',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-600',
      };
    }
    return {
      icon: AlertTriangle,
      title: '账号异常',
      description: '您的账号存在异常，暂时无法使用',
      color: 'slate',
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-600',
    };
  };
  
  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 flex items-center justify-center py-24 px-4">
      <div className="max-w-md w-full">
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

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Reason */}
            {reason && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-bold text-slate-700 mb-2">详细原因</h4>
                <p className="text-sm text-slate-600">{reason}</p>
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h4 className="font-bold text-blue-800 mb-2">如何解决?</h4>
              <p className="text-sm text-blue-700">
                如果您认为这是一个错误，或者想了解更多详情，请联系我们的客服团队。
                我们会尽快为您处理。
              </p>
            </div>

            {/* Contact Options */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-700">联系方式</h4>
              <div className="space-y-2">
                <a
                  href="mailto:support@vetsphere.cn"
                  className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">邮件客服</p>
                    <p className="text-sm text-slate-500">support@vetsphere.cn</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-8 pt-0 space-y-4">
            <Link
              href={`/${locale}`}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              <span>返回首页</span>
            </Link>
            
            <button
              onClick={() => router.back()}
              className="w-full py-3 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">返回上一页</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CnAccountStatusPage;
