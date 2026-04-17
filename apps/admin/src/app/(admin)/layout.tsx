'use client';

import React from 'react';
import AdminShell from '@/components/AdminShell';
import { SiteProvider } from '@/context/SiteContext';
import { AuthGuard } from '@vetsphere/shared/components/AuthGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard loginPath="/" requiredRole="Admin">
      <SiteProvider>
        <AdminShell>{children}</AdminShell>
      </SiteProvider>
    </AuthGuard>
  );
}
