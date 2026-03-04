'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';

// Access level hierarchy (higher number = more permissions)
const ACCESS_LEVEL_HIERARCHY: Record<string, number> = {
  guest: 0,
  registered_basic: 1,
  profiled_user: 2,
  verification_pending: 3,
  verified_professional: 4,
};

// User state from /api/auth/me
export interface CnUserState {
  isLoggedIn: boolean;
  user?: {
    id: string;
    mobile: string;
    status: string;
    displayName?: string;
    avatarUrl?: string;
    realName?: string;
    organizationName?: string;
  };
  identity?: {
    identityType?: string;
    identityGroup?: string;
    identityVerifiedFlag?: boolean;
  };
  onboarding?: {
    status: string;
    profileCompletionPercent?: number;
  };
  verification?: {
    required: boolean;
    status?: string;
    rejectReason?: string;
  };
  access?: {
    level: string;
    permissionFlags?: Record<string, boolean>;
  };
  redirectHint: string;
  accountStatusReason?: string;
}

export interface AuthGuardOptions {
  // Minimum access level required to view the page
  requiredLevel?: string;
  // Required permission flag (from permissionFlags)
  requiredPermission?: string;
  // Whether to redirect to login if not authenticated
  requireAuth?: boolean;
  // Whether to show verification prompt instead of blocking
  showVerificationPrompt?: boolean;
  // Custom redirect path if access denied
  deniedRedirectPath?: string;
}

export interface AuthGuardResult {
  // User state
  userState: CnUserState | null;
  // Loading state
  isLoading: boolean;
  // Whether user has required access
  hasAccess: boolean;
  // Whether user is authenticated
  isAuthenticated: boolean;
  // Access denied reason (if any)
  deniedReason?: string;
  // Refresh user state
  refresh: () => Promise<void>;
}

/**
 * Hook for CN site authentication and authorization
 * 
 * Usage:
 * ```tsx
 * const { userState, isLoading, hasAccess, deniedReason } = useCnAuthGuard({
 *   requiredLevel: 'verified_professional',
 *   requireAuth: true,
 * });
 * 
 * if (isLoading) return <Loading />;
 * if (!hasAccess) return <AccessDenied reason={deniedReason} />;
 * return <ProtectedContent />;
 * ```
 */
export function useCnAuthGuard(options: AuthGuardOptions = {}): AuthGuardResult {
  const {
    requiredLevel = 'guest',
    requiredPermission,
    requireAuth = false,
    showVerificationPrompt = false,
    deniedRedirectPath,
  } = options;

  const { locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  
  const [userState, setUserState] = useState<CnUserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user state
  const fetchUserState = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!res.ok) {
        // Not authenticated
        setUserState({
          isLoggedIn: false,
          redirectHint: 'go_home',
          access: { level: 'guest' },
        });
        return;
      }
      
      const data = await res.json();
      setUserState(data);
    } catch {
      setUserState({
        isLoggedIn: false,
        redirectHint: 'go_home',
        access: { level: 'guest' },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUserState();
  }, [fetchUserState]);

  // Check access level
  const hasAccessLevel = (required: string, actual: string): boolean => {
    const requiredRank = ACCESS_LEVEL_HIERARCHY[required] ?? 0;
    const actualRank = ACCESS_LEVEL_HIERARCHY[actual] ?? 0;
    return actualRank >= requiredRank;
  };

  // Compute access result
  const computeAccessResult = useCallback((): { hasAccess: boolean; deniedReason?: string } => {
    if (!userState) {
      return { hasAccess: false };
    }

    const actualLevel = userState.access?.level || 'guest';
    const isLoggedIn = userState.isLoggedIn;

    // Check authentication requirement
    if (requireAuth && !isLoggedIn) {
      return { hasAccess: false, deniedReason: 'requires_login' };
    }

    // Check account status
    if (userState.user?.status === 'disabled') {
      return { hasAccess: false, deniedReason: 'account_disabled' };
    }
    if (userState.user?.status === 'banned') {
      return { hasAccess: false, deniedReason: 'account_banned' };
    }

    // Check access level
    if (!hasAccessLevel(requiredLevel, actualLevel)) {
      // Determine specific reason
      if (!isLoggedIn) {
        return { hasAccess: false, deniedReason: 'requires_login' };
      }
      if (actualLevel === 'registered_basic') {
        return { hasAccess: false, deniedReason: 'requires_profile' };
      }
      if (actualLevel === 'profiled_user') {
        if (userState.verification?.required) {
          return { hasAccess: false, deniedReason: 'requires_verification' };
        }
        return { hasAccess: false, deniedReason: 'insufficient_level' };
      }
      if (actualLevel === 'verification_pending') {
        return { hasAccess: false, deniedReason: 'verification_pending' };
      }
      return { hasAccess: false, deniedReason: 'insufficient_level' };
    }

    // Check specific permission
    if (requiredPermission) {
      const permissions = userState.access?.permissionFlags || {};
      if (!permissions[requiredPermission]) {
        return { hasAccess: false, deniedReason: 'missing_permission' };
      }
    }

    return { hasAccess: true };
  }, [userState, requireAuth, requiredLevel, requiredPermission]);

  const { hasAccess, deniedReason } = computeAccessResult();

  // Handle redirect based on denied reason
  useEffect(() => {
    if (isLoading || hasAccess) return;
    if (showVerificationPrompt && deniedReason === 'requires_verification') return;

    const redirectPath = deniedRedirectPath || getRedirectPath(deniedReason, locale);
    
    if (redirectPath && pathname !== redirectPath) {
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${redirectPath}?redirect=${returnUrl}`);
    }
  }, [isLoading, hasAccess, deniedReason, deniedRedirectPath, locale, router, pathname, showVerificationPrompt]);

  return {
    userState,
    isLoading,
    hasAccess,
    isAuthenticated: userState?.isLoggedIn ?? false,
    deniedReason,
    refresh: fetchUserState,
  };
}

// Get redirect path based on denied reason
function getRedirectPath(reason: string | undefined, locale: string): string {
  switch (reason) {
    case 'requires_login':
      return `/${locale}/auth`;
    case 'requires_profile':
      return `/${locale}/onboarding/identity`;
    case 'requires_verification':
      return `/${locale}/verification/apply`;
    case 'verification_pending':
      return `/${locale}/verification/status`;
    case 'account_disabled':
    case 'account_banned':
      return `/${locale}/auth/account-status`;
    default:
      return '';
  }
}

/**
 * Get user-friendly message for denied reason
 */
export function getDeniedMessage(reason: string | undefined): { title: string; description: string } {
  switch (reason) {
    case 'requires_login':
      return {
        title: '请先登录',
        description: '您需要登录后才能访问此内容',
      };
    case 'requires_profile':
      return {
        title: '请完善资料',
        description: '请先完成身份选择和资料填写',
      };
    case 'requires_verification':
      return {
        title: '需要专业认证',
        description: '此内容仅对认证用户开放，请先完成专业认证',
      };
    case 'verification_pending':
      return {
        title: '认证审核中',
        description: '您的认证申请正在审核中，请耐心等待',
      };
    case 'account_disabled':
      return {
        title: '账号已禁用',
        description: '您的账号已被暂时禁用，如有疑问请联系客服',
      };
    case 'account_banned':
      return {
        title: '账号已封禁',
        description: '您的账号已被封禁，如有疑问请联系客服',
      };
    case 'missing_permission':
      return {
        title: '权限不足',
        description: '您没有访问此内容的权限',
      };
    default:
      return {
        title: '无法访问',
        description: '您暂时无法访问此内容',
      };
  }
}

export default useCnAuthGuard;
