'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { useAuth } from '@/context/AuthContext';

/**
 * Conditional layout wrapper that shows/hides Navbar and Footer
 * based on the current route (standalone pages like /live, admin portals).
 */
export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isStandalonePage = () => {
    if (['/sys-admin', '/partners/gear', '/partners/edu', '/live'].includes(pathname)) return true;
    if (pathname === '/dashboard') {
      return user?.role && user.role !== 'Doctor';
    }
    return false;
  };

  const standalone = isStandalonePage();

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col">
        {!standalone && <Navbar />}
        <main className="flex-1">
          {children}
        </main>
        {!standalone && <Footer />}
      </div>
    </>
  );
}
