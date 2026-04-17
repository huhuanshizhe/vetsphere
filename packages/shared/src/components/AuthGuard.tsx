'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  /** Path to redirect unauthenticated users to */
  loginPath?: string;
  /** If set, only users with this role may access */
  requiredRole?: string;
  /** Custom loading fallback */
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  loginPath = '/auth',
  requiredRole,
  fallback,
}: AuthGuardProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace(loginPath);
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      router.replace(loginPath);
    }
  }, [loading, isAuthenticated, user?.role, requiredRole, loginPath, router]);

  if (loading) {
    return (
      fallback ?? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
        </div>
      )
    );
  }

  if (!isAuthenticated) return null;
  if (requiredRole && user?.role !== requiredRole) return null;

  return <>{children}</>;
}
