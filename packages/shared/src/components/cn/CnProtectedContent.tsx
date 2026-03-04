'use client';

import React from 'react';
import { useCnAuthGuard, AuthGuardOptions } from '../../hooks/useCnAuthGuard';
import CnAccessDenied from './CnAccessDenied';

interface CnProtectedContentProps extends AuthGuardOptions {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  deniedComponent?: React.ReactNode;
}

/**
 * Wrapper component for protected content
 * 
 * Usage:
 * ```tsx
 * <CnProtectedContent requiredLevel="verified_professional">
 *   <MyProtectedPage />
 * </CnProtectedContent>
 * ```
 */
const CnProtectedContent: React.FC<CnProtectedContentProps> = ({
  children,
  loadingComponent,
  deniedComponent,
  ...guardOptions
}) => {
  const { isLoading, hasAccess, deniedReason } = useCnAuthGuard(guardOptions);

  // Loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    if (deniedComponent) {
      return <>{deniedComponent}</>;
    }
    return <CnAccessDenied reason={deniedReason} />;
  }

  // Access granted
  return <>{children}</>;
};

export default CnProtectedContent;
