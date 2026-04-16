'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@vetsphere/shared/context/AuthContext";
import { supabase } from "@vetsphere/shared/services/supabase";

type BridgeStatus = "idle" | "syncing" | "resolved";

type GuidanceSessionBridgeContextValue = {
  bridgeStatus: BridgeStatus;
  isSyncing: boolean;
};

const GuidanceSessionBridgeContext = createContext<GuidanceSessionBridgeContextValue>({
  bridgeStatus: "idle",
  isSyncing: false,
});

export function GuidanceSessionBridgeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, isAuthenticated, refreshSession } = useAuth();
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>("idle");
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);
  const attemptKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (pathname?.startsWith("/join/")) {
      setBridgeStatus("resolved");
      setBridgeUrl(null);
      return;
    }

    if (loading) {
      return;
    }

    if (isAuthenticated) {
      setBridgeStatus("resolved");
      setBridgeUrl(null);
      return;
    }

    const attemptKey = `${window.location.origin}:${pathname || "/"}`;
    if (attemptKeyRef.current === attemptKey) {
      return;
    }

    attemptKeyRef.current = attemptKey;
    setBridgeStatus("syncing");
    setBridgeUrl(`https://vetsphere.cn/zh/auth/bridge?origin=${encodeURIComponent(window.location.origin)}`);

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function handleSessionMessage(event: MessageEvent) {
      if (event.origin !== "https://vetsphere.cn") {
        return;
      }

      const messageType = event.data?.type;
      if (messageType === "vetsphere-auth-bridge-none") {
        if (!cancelled) {
          setBridgeStatus("resolved");
          setBridgeUrl(null);
        }
        return;
      }

      if (messageType !== "vetsphere-auth-bridge-session") {
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
        if (!cancelled) {
          setBridgeStatus("resolved");
          setBridgeUrl(null);
        }
      }
    }

    window.addEventListener("message", handleSessionMessage);
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        setBridgeStatus("resolved");
        setBridgeUrl(null);
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.removeEventListener("message", handleSessionMessage);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading, isAuthenticated, pathname, refreshSession]);

  const value = useMemo(
    () => ({
      bridgeStatus,
      isSyncing: bridgeStatus === "syncing",
    }),
    [bridgeStatus]
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
