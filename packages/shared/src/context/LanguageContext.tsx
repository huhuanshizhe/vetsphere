'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
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
  locales = ['zh', 'en', 'th', 'ja'] as const,
  defaultLocale = 'zh'
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // State to track if auto-detection has been attempted
  const [autoDetectionAttempted, setAutoDetectionAttempted] = useState(false);

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

  // Auto-detect language based on IP/geolocation for first-time visitors
  // TEMPORARILY DISABLED: Investigating Turbopack crash
  // useEffect(() => {
  //   const autoDetect = async () => {
  //     // Only attempt auto-detection once
  //     if (autoDetectionAttempted) return;

  //     // Check if user already has a language preference
  //     if (!shouldAutoDetectLanguage()) {
  //       setAutoDetectionAttempted(true);
  //       return;
  //     }

  //     // Check if current URL already has a language
  //     const segments = pathname.split('/');
  //     const pathLocale = segments[1];

  //     // Only auto-detect if path doesn't have a locale or has default locale
  //     if (locales.includes(pathLocale as Locale) && pathLocale !== defaultLocale) {
  //       setAutoDetectionAttempted(true);
  //       return;
  //     }

  //     try {
  //       console.log('[LanguageContext] Auto-detecting language...');
  //       const detectedLanguage = await detectLanguage(locales as readonly string[]);

  //       if (detectedLanguage && detectedLanguage !== language) {
  //         console.log('[LanguageContext] Detected language:', detectedLanguage);
  //         setLanguage(detectedLanguage as Locale);
  //       }
  //     } catch (error) {
  //       console.warn('[LanguageContext] Auto-detection failed:', error);
  //     } finally {
  //       setAutoDetectionAttempted(true);
  //     }
  //   };

  //   autoDetect();
  // }, [autoDetectionAttempted, pathname, language, locales, defaultLocale]);

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
