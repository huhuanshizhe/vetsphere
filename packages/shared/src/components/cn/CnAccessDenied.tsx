'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { getDeniedMessage } from '../../hooks/useCnAuthGuard';
import { Lock, AlertCircle, Shield, Clock, UserX, ArrowRight, Home } from 'lucide-react';

interface CnAccessDeniedProps {
  reason?: string;
  showHomeLink?: boolean;
  customTitle?: string;
  customDescription?: string;
  showVerificationButton?: boolean;
  onVerificationClick?: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  requires_login: <Lock className="w-12 h-12" />,
  requires_profile: <AlertCircle className="w-12 h-12" />,
  requires_verification: <Shield className="w-12 h-12" />,
  verification_pending: <Clock className="w-12 h-12" />,
  account_disabled: <UserX className="w-12 h-12" />,
  account_banned: <UserX className="w-12 h-12" />,
  missing_permission: <Lock className="w-12 h-12" />,
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  requires_login: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  requires_profile: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
  requires_verification: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
  verification_pending: { bg: 'bg-sky-100', text: 'text-sky-600', border: 'border-sky-200' },
  account_disabled: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
  account_banned: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
  missing_permission: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

const CnAccessDenied: React.FC<CnAccessDeniedProps> = ({
  reason = 'missing_permission',
  showHomeLink = true,
  customTitle,
  customDescription,
  showVerificationButton = false,
  onVerificationClick,
}) => {
  const { locale } = useLanguage();
  const { title, description } = getDeniedMessage(reason);
  const displayTitle = customTitle || title;
  const displayDescription = customDescription || description;
  
  const icon = iconMap[reason] || <Lock className="w-12 h-12" />;
  const colors = colorMap[reason] || colorMap.missing_permission;

  // Get action button based on reason
  const getActionButton = () => {
    switch (reason) {
      case 'requires_login':
        return (
          <Link
            href={`/${locale}/auth`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            <span>去登录</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        );
      case 'requires_profile':
        return (
          <Link
            href={`/${locale}/onboarding/identity`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            <span>完善资料</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        );
      case 'requires_verification':
        if (showVerificationButton && onVerificationClick) {
          return (
            <button
              onClick={onVerificationClick}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              <span>去认证</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          );
        }
        return (
          <Link
            href={`/${locale}/verification/apply`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            <span>申请认证</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        );
      case 'verification_pending':
        return (
          <Link
            href={`/${locale}/verification/status`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            <span>查看进度</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        );
      case 'account_disabled':
      case 'account_banned':
        return (
          <a
            href="mailto:support@vetsphere.cn"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            <span>联系客服</span>
            <ArrowRight className="w-5 h-5" />
          </a>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className={`w-24 h-24 ${colors.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <div className={colors.text}>{icon}</div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          {displayTitle}
        </h2>

        {/* Description */}
        <p className="text-slate-600 mb-8">
          {displayDescription}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-4">
          {getActionButton()}
          
          {showHomeLink && (
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">返回首页</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CnAccessDenied;
