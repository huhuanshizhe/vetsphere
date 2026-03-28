'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'zh', name: '简体', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

export function LanguageSelector() {
  const { language } = useLanguage();
  const pathname = usePathname();

  // Detect locale from pathname
  const currentLocale = pathname.split('/')[1] || 'en';

  const handleLanguageChange = useCallback((langCode: string) => {
    if (langCode === language) return;
    window.location.href = `/${langCode}${pathname}`;
  }, [language, pathname]);

  return (
    <div className="relative z-50">
      <div className="flex items-center gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              language === lang.code
                ? 'bg-white/95 text-slate-900 shadow-sm border-slate-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            title={lang.name}
          >
            <span className="text-base">{lang.flag}</span>
            <span className={`hidden sm:inline-block ${language === lang.code ? 'text-slate-900' : 'text-slate-500'}`}>
              {lang.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
