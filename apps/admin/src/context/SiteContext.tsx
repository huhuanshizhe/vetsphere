'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SiteCode = 'cn' | 'intl' | 'global';

interface SiteContextValue {
  currentSite: SiteCode;
  setCurrentSite: (site: SiteCode) => void;
  siteLabel: string;
  isCN: boolean;
  isINTL: boolean;
  isGLOBAL: boolean;
}

const SITE_LABELS: Record<SiteCode, string> = {
  cn: '中国站',
  intl: '国际站',
  global: '全局',
};

const STORAGE_KEY = 'admin_current_site';

const SiteContext = createContext<SiteContextValue | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [currentSite, setCurrentSiteState] = useState<SiteCode>('cn');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'cn' || stored === 'intl' || stored === 'global') {
      setCurrentSiteState(stored);
    }
  }, []);

  const setCurrentSite = useCallback((site: SiteCode) => {
    setCurrentSiteState(site);
    localStorage.setItem(STORAGE_KEY, site);
  }, []);

  const value: SiteContextValue = {
    currentSite,
    setCurrentSite,
    siteLabel: SITE_LABELS[currentSite],
    isCN: currentSite === 'cn',
    isINTL: currentSite === 'intl',
    isGLOBAL: currentSite === 'global',
  };

  return (
    <SiteContext.Provider value={value}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return ctx;
}

export default SiteContext;
