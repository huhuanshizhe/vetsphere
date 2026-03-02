'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { translations } from '../translations';
import type { SupportedLocale } from '../site-config.types';

// Type alias for compatibility
type Locale = SupportedLocale;

interface LanguageContextType {
  language: Locale;
  locale: Locale; // alias for language
  setLanguage: (lang: Locale) => void;
  t: typeof translations['en'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
  locales?: readonly Locale[]; // Passed from app config
  defaultLocale?: Locale; // Passed from app config
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ 
  children, 
  initialLocale,
  locales = ['zh', 'en', 'th'] as const,
  defaultLocale = 'zh'
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // Extract locale from pathname or use initial
  const getLocaleFromPath = (): Locale => {
    const segments = pathname.split('/');
    const pathLocale = segments[1];
    if (locales.includes(pathLocale as Locale)) {
      return pathLocale as Locale;
    }
    return initialLocale || defaultLocale;
  };

  const [language, setLanguageState] = useState<Locale>(getLocaleFromPath);

  const setLanguage = useCallback((lang: Locale) => {
    setLanguageState(lang);
    
    // Save preference
    if (typeof window !== 'undefined') {
      const prefix = process.env?.NEXT_PUBLIC_STORAGE_PREFIX || 'vetsphere_';
      localStorage.setItem(`${prefix}lang`, lang);
      document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }

    // Navigate to new locale path
    const segments = pathname.split('/');
    const currentLocale = segments[1];
    
    if (locales.includes(currentLocale as Locale)) {
      // Replace current locale with new one
      segments[1] = lang;
      router.push(segments.join('/'));
    } else {
      // No locale in path, prepend new locale
      router.push(`/${lang}${pathname}`);
    }
  }, [pathname, router, locales]);

  // Update document lang attribute
  React.useEffect(() => {
    const langMap: Record<string, string> = { zh: 'zh-CN', en: 'en', th: 'th' };
    document.documentElement.lang = langMap[language] || 'en';
  }, [language]);

  const value = {
    language,
    locale: language,
    setLanguage,
    t: (translations as unknown as Record<string, typeof translations['en']>)[language] || translations.en
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
