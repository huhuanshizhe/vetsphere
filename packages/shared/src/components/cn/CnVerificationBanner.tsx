'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { Shield, X, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { CnUserState } from '../../hooks/useCnAuthGuard';

interface CnVerificationBannerProps {
  userState: CnUserState | null;
  dismissible?: boolean;
  className?: string;
}

/**
 * Banner to prompt users for verification
 * Shows different messages based on user state
 */
const CnVerificationBanner: React.FC<CnVerificationBannerProps> = ({
  userState,
  dismissible = true,
  className = '',
}) => {
  const { locale } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !userState?.isLoggedIn) {
    return null;
  }

  const { verification, redirectHint, access } = userState;

  // Don't show if already verified or verification not required
  if (access?.level === 'verified_professional' || !verification?.required) {
    return null;
  }

  // Determine banner config based on status
  const getBannerConfig = () => {
    if (redirectHint === 'show_verification_prompt') {
      return {
        icon: <Shield className="w-5 h-5" />,
        title: '完成专业认证',
        description: '认证后可解锁全部专业内容和功能',
        linkText: '去认证',
        linkHref: `/${locale}/verification/apply`,
        bgColor: 'bg-gradient-to-r from-purple-500/10 to-blue-500/10',
        borderColor: 'border-purple-500/20',
        textColor: 'text-purple-600',
      };
    }
    
    if (redirectHint === 'show_verification_pending' || verification?.status === 'submitted') {
      return {
        icon: <Clock className="w-5 h-5" />,
        title: '认证审核中',
        description: '您的认证申请正在审核，通常需要1-3个工作日',
        linkText: '查看进度',
        linkHref: `/${locale}/verification/status`,
        bgColor: 'bg-gradient-to-r from-sky-500/10 to-cyan-500/10',
        borderColor: 'border-sky-500/20',
        textColor: 'text-sky-600',
      };
    }
    
    if (redirectHint === 'show_rejection_prompt' || verification?.status === 'rejected') {
      return {
        icon: <AlertCircle className="w-5 h-5" />,
        title: '认证未通过',
        description: verification?.rejectReason || '请修改申请后重新提交',
        linkText: '重新申请',
        linkHref: `/${locale}/verification/apply`,
        bgColor: 'bg-gradient-to-r from-amber-500/10 to-orange-500/10',
        borderColor: 'border-amber-500/20',
        textColor: 'text-amber-600',
      };
    }

    return null;
  };

  const config = getBannerConfig();
  
  if (!config) {
    return null;
  }

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`${config.textColor} flex-shrink-0 mt-0.5`}>
          {config.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold ${config.textColor} mb-1`}>
            {config.title}
          </h4>
          <p className="text-sm text-slate-600 line-clamp-2">
            {config.description}
          </p>
        </div>
        
        {/* Action */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={config.linkHref}
            className={`inline-flex items-center gap-1 px-4 py-2 ${config.textColor} bg-white rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors border ${config.borderColor}`}
          >
            <span>{config.linkText}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          {dismissible && (
            <button
              onClick={() => setDismissed(true)}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CnVerificationBanner;
