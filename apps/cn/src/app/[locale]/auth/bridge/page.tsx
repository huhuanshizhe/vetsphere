'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSessionSafe } from '@vetsphere/shared/services/supabase';

const DEFAULT_ALLOWED_TARGET_ORIGINS = [
  'https://guidance.vetsphere.cn',
  'http://localhost:3006',
  'http://127.0.0.1:3006',
];

const EXTRA_ALLOWED_TARGET_ORIGINS = (
  process.env.NEXT_PUBLIC_GUIDANCE_BRIDGE_ALLOWED_ORIGINS || ''
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_TARGET_ORIGINS = new Set([
  ...DEFAULT_ALLOWED_TARGET_ORIGINS,
  ...EXTRA_ALLOWED_TARGET_ORIGINS,
]);

export default function AuthBridgePage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const targetOrigin = searchParams.get('origin') || '';
    if (!ALLOWED_TARGET_ORIGINS.has(targetOrigin)) {
      return;
    }

    let cancelled = false;

    async function syncSessionToParent() {
      try {
        const { data: { session } } = await getSessionSafe();
        if (cancelled || !window.parent) {
          return;
        }

        if (session?.access_token && session?.refresh_token) {
          window.parent.postMessage(
            {
              type: 'vetsphere-auth-bridge-session',
              payload: {
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
              },
            },
            targetOrigin
          );
          return;
        }

        window.parent.postMessage({ type: 'vetsphere-auth-bridge-none' }, targetOrigin);
      } catch {
        if (!cancelled && window.parent) {
          window.parent.postMessage({ type: 'vetsphere-auth-bridge-none' }, targetOrigin);
        }
      }
    }

    void syncSessionToParent();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-sm text-slate-500">
      正在同步主站登录态…
    </main>
  );
}
