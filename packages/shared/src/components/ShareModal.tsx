'use client';

import React, { useState, useCallback } from 'react';
import { getSocialPlatforms, shareToPlatform, SocialPlatform } from '../config/social-config';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  shareTitle: string;
  shareText?: string;
  market: 'cn' | 'intl';
  locale?: string;
  onShareComplete?: (platform: string) => void;
  translations?: {
    title?: string;
    description?: string;
    cancel?: string;
    copied?: string;
  };
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  shareTitle,
  shareText = '',
  market,
  locale,
  onShareComplete,
  translations = {},
}) => {
  const [showCopied, setShowCopied] = useState(false);
  const platforms = getSocialPlatforms(market, locale);

  const t = {
    title: translations.title || (locale === 'zh' ? '分享内容' : 'Share'),
    description: translations.description || (locale === 'zh' ? '选择分享平台' : 'Choose a platform to share'),
    cancel: translations.cancel || (locale === 'zh' ? '取消' : 'Cancel'),
    copied: translations.copied || (locale === 'zh' ? '链接已复制' : 'Link copied!'),
  };

  const handleShare = useCallback(async (platform: SocialPlatform) => {
    // Handle native system share
    if (platform.id === 'system') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          });
          onShareComplete?.(platform.id);
          onClose();
        } catch (e) {
          console.log('Native share cancelled');
        }
      }
      return;
    }

    const success = await shareToPlatform(platform, shareUrl, shareTitle);
    
    if (platform.id === 'copy' && success) {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
    
    if (success) {
      onShareComplete?.(platform.id);
    }
  }, [shareUrl, shareTitle, shareText, onShareComplete, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-[32px] md:rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 sm:space-y-8 animate-in zoom-in-95" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#00A884]/10 rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-4xl mx-auto mb-4 sm:mb-6">
            📢
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">{t.title}</h3>
          <p className="text-slate-400 text-xs sm:text-sm font-bold mt-2">{t.description}</p>
        </div>

        {/* Copied Toast */}
        {showCopied && (
          <div className="bg-emerald-50 text-emerald-600 text-sm font-bold py-3 px-4 rounded-xl text-center animate-in slide-in-from-top-2">
            ✓ {t.copied}
          </div>
        )}

        {/* Platform Grid */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {platforms.map(platform => (
            <button 
              key={platform.id} 
              onClick={() => handleShare(platform)} 
              className="flex flex-col items-center gap-2 sm:gap-3 group transition-all min-h-[80px]"
            >
              <div 
                className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:border-transparent group-hover:text-white"
                style={{ 
                  '--hover-bg': platform.color || '#64748B',
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = platform.color || '#64748B';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
              >
                {platform.icon}
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-900 tracking-widest text-center">
                {platform.label}
              </span>
            </button>
          ))}
          
          {/* System Share (only if available) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button 
              onClick={() => handleShare({ id: 'system', label: 'System', icon: '📱' })} 
              className="flex flex-col items-center gap-2 sm:gap-3 group transition-all min-h-[80px]"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:bg-[#00A884] group-hover:border-transparent group-hover:text-white">
                📱
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-900 tracking-widest">
                {locale === 'zh' ? '系统' : 'System'}
              </span>
            </button>
          )}
        </div>

        {/* Cancel Button */}
        <button 
          onClick={onClose} 
          className="w-full py-4 sm:py-5 border-2 border-slate-100 text-slate-400 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:bg-slate-50 transition-colors min-h-[48px]"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
export { ShareModal };
export type { ShareModalProps };
