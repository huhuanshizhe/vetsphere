
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { translations } from '../translations';

type Language = 'en' | 'th' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['en'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize language from URL param OR local storage OR default to 'en'
  const getInitialLang = (): Language => {
    const urlLang = searchParams.get('lang');
    if (urlLang && ['en', 'zh', 'th'].includes(urlLang)) return urlLang as Language;
    
    const saved = localStorage.getItem('vetsphere_lang');
    if (saved && ['en', 'zh', 'th'].includes(saved)) return saved as Language;
    
    return 'en';
  };

  const [language, setLanguageState] = useState<Language>(getInitialLang);

  // Sync state when URL changes (e.g. user navigates back/forward)
  useEffect(() => {
    const urlLang = searchParams.get('lang');
    if (urlLang && ['en', 'zh', 'th'].includes(urlLang) && urlLang !== language) {
        setLanguageState(urlLang as Language);
    }
  }, [searchParams]);

  // Update URL, LocalStorage, and HTML Attribute when language changes
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('vetsphere_lang', lang);
    
    // SEO: Update URL without reloading page
    setSearchParams(prev => {
        prev.set('lang', lang);
        return prev;
    }, { replace: true }); // Use replace to avoid polluting history stack with language toggles
  };

  // SEO: Update HTML lang attribute for crawlers
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language === 'th' ? 'th' : 'en';
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: translations[language]
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
