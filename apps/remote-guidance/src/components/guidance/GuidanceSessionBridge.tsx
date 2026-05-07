'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { supabase } from '@vetsphere/shared/services/supabase';

type BridgeStatus = 'idle' | 'syncing' | 'resolved';

type GuidanceSessionBridgeContextValue = {
  bridgeStatus: BridgeStatus;
  isSyncing: boolean;
  recheckMainSession: () => void;
};

const GuidanceSessionBridgeContext = createContext<GuidanceSessionBridgeContextValue>({
  bridgeStatus: 'idle',
  isSyncing: false,
  recheckMainSession: () => {},
});

export function GuidanceSessionBridgeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, refreshSession } = useAuth();
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('idle');
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);
  const [syncVersion, setSyncVersion] = useState(0);
  const isSyncingRef = useRef(false);
  const lastAttemptKeyRef = useRef<string | null>(null);

  const recheckMainSession = useCallback(() => {
    setSyncVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    function handleFocus() {
      setSyncVersion((current) => current + 1);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        setSyncVersion((current) => current + 1);
      }
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (pathname?.startsWith('/join/')) {
      setBridgeStatus('resolved');
      setBridgeUrl(null);
      return;
    }

    if (loading || isSyncingRef.current) {
      return;
    }

    const attemptKey = `${window.location.origin}:${pathname || '/'}:${syncVersion}`;
    if (lastAttemptKeyRef.current === attemptKey) {
      return;
    }

    lastAttemptKeyRef.current = attemptKey;
    isSyncingRef.current = true;
    setBridgeStatus('syncing');
    setBridgeUrl(
      `https://vetsphere.cn/zh/auth/bridge?origin=${encodeURIComponent(window.location.origin)}&ts=${Date.now()}`,
    );

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function finishSync() {
      if (!cancelled) {
        setBridgeStatus('resolved');
        setBridgeUrl(null);
      }
      isSyncingRef.current = false;
    }

    async function handleSessionMessage(event: MessageEvent) {
      if (event.origin !== 'https://vetsphere.cn') {
        return;
      }

      const messageType = event.data?.type;
      if (messageType === 'vetsphere-auth-bridge-none') {
        try {
          // 如果本地已有有效 session（通过本地登录表单），不要因为主站没有 session 就退出登录
          // 这在开发环境（localhost）尤其重要：本地验证码登录的 session 不应被主站 bridge 覆盖
          const {
            data: { session: localSession },
          } = await supabase.auth.getSession();
          if (!localSession) {
            await supabase.auth.signOut();
          }
        } finally {
          await finishSync();
        }
        return;
      }

      if (messageType !== 'vetsphere-auth-bridge-session') {
        return;
      }

      const accessToken = event.data?.payload?.accessToken;
      const refreshToken = event.data?.payload?.refreshToken;
      if (!accessToken || !refreshToken) {
        return;
      }

      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        await refreshSession();
      } finally {
        await finishSync();
      }
    }

    window.addEventListener('message', handleSessionMessage);
    timeoutId = setTimeout(() => {
      void finishSync();
    }, 5000);

    return () => {
      cancelled = true;
      isSyncingRef.current = false;
      window.removeEventListener('message', handleSessionMessage);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading, pathname, refreshSession, syncVersion]);

  const value = useMemo(
    () => ({
      bridgeStatus,
      isSyncing: bridgeStatus === 'syncing',
      recheckMainSession,
    }),
    [bridgeStatus, recheckMainSession],
  );

  return (
    <GuidanceSessionBridgeContext.Provider value={value}>
      {bridgeUrl ? <iframe title="auth-bridge" src={bridgeUrl} className="hidden" /> : null}
      {children}
    </GuidanceSessionBridgeContext.Provider>
  );
}

export function useGuidanceSessionBridge() {
  return useContext(GuidanceSessionBridgeContext);
}
