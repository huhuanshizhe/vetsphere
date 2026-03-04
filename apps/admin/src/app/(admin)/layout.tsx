'use client';

import React from 'react';
import AdminShell from '@/components/AdminShell';
import { SiteProvider } from '@/context/SiteContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteProvider>
      <AdminShell>{children}</AdminShell>
    </SiteProvider>
  );
}
