'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getAccessTokenLocal } from '@/lib/supabase/client';

export type SiteCode = 'cn' | 'intl' | 'global';

interface SiteContextValue {
  currentSite: SiteCode;
  setCurrentSite: (site: SiteCode) => void;
  siteLabel: string;
  isCN: boolean;
  isINTL: boolean;
  isGLOBAL: boolean;
  /** 当前管理员被授权访问的站点。未加载完成前默认为全部 3 个。 */
  authorizedSites: SiteCode[];
  /** authorizedSites 是否已从后端加载 */
  authorizedSitesLoaded: boolean;
}

const SITE_LABELS: Record<SiteCode, string> = {
  cn: '中国站',
  intl: '国际站',
  global: '全局',
};

const STORAGE_KEY = 'admin_current_site';
const ALL_SITES: SiteCode[] = ['cn', 'intl', 'global'];

function isValidSite(value: unknown): value is SiteCode {
  return value === 'cn' || value === 'intl' || value === 'global';
}

const SiteContext = createContext<SiteContextValue | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [currentSite, setCurrentSiteState] = useState<SiteCode>('cn');
  const [authorizedSites, setAuthorizedSites] = useState<SiteCode[]>([]);
  const [authorizedSitesLoaded, setAuthorizedSitesLoaded] = useState(false);

  // 1. 先从 localStorage 恢复（避免首屏闪烁）
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValidSite(stored)) {
      setCurrentSiteState(stored);
    }
  }, []);

  // 2. 从 /api/admin/me 拉取授权站点白名单
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const token = await getAccessTokenLocal();
        if (!token) return;
        const res = await fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (aborted) return;
        const sites: SiteCode[] = Array.isArray(data?.authorizedSites)
          ? data.authorizedSites.filter(isValidSite)
          : [];
        if (sites.length === 0) return;
        setAuthorizedSites(sites);
        setAuthorizedSitesLoaded(true);
        // 若当前站点不在白名单内，回退到第一个授权站点
        setCurrentSiteState((prev) => {
          if (sites.includes(prev)) return prev;
          const fallback = sites[0];
          localStorage.setItem(STORAGE_KEY, fallback);
          return fallback;
        });
      } catch {
        // 静默失败：保持现状，下次刷新再试
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  const setCurrentSite = useCallback(
    (site: SiteCode) => {
      // 白名单校验：未加载或允许的站点才能切换
      if (authorizedSitesLoaded && !authorizedSites.includes(site)) {
        // eslint-disable-next-line no-console
        console.warn(`[SiteContext] 当前账号无权访问站点：${site}`);
        return;
      }
      setCurrentSiteState(site);
      localStorage.setItem(STORAGE_KEY, site);
    },
    [authorizedSites, authorizedSitesLoaded]
  );

  const value = useMemo<SiteContextValue>(
    () => ({
      currentSite,
      setCurrentSite,
      siteLabel: SITE_LABELS[currentSite],
      isCN: currentSite === 'cn',
      isINTL: currentSite === 'intl',
      isGLOBAL: currentSite === 'global',
      authorizedSites: authorizedSitesLoaded ? authorizedSites : ALL_SITES,
      authorizedSitesLoaded,
    }),
    [currentSite, setCurrentSite, authorizedSites, authorizedSitesLoaded]
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return ctx;
}

export default SiteContext;
