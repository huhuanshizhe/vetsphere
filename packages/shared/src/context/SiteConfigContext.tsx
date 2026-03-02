'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { SiteConfig, MarketType } from '../site-config.types';

interface SiteConfigContextType {
  siteConfig: SiteConfig;
  market: MarketType;
  isCN: boolean;
  isINTL: boolean;
  isAdmin: boolean;
}

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined);

interface SiteConfigProviderProps {
  children: ReactNode;
  config: SiteConfig;
}

export const SiteConfigProvider: React.FC<SiteConfigProviderProps> = ({ 
  children, 
  config 
}) => {
  const value: SiteConfigContextType = {
    siteConfig: config,
    market: config.market,
    isCN: config.market === 'cn',
    isINTL: config.market === 'intl',
    isAdmin: config.market === 'admin',
  };

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  );
};

export const useSiteConfig = () => {
  const context = useContext(SiteConfigContext);
  if (!context) {
    throw new Error('useSiteConfig must be used within a SiteConfigProvider');
  }
  return context;
};
