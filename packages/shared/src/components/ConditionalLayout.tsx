'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { IntlNavbar } from '../components/intl/IntlNavbar';
import { IntlFooter } from '../components/intl/IntlFooter';
import ScrollToTop from '../components/ScrollToTop';
import { useAuth } from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import type { SupportedLocale } from '../site-config.types';

/**
 * Conditional layout wrapper that shows/hides Navbar and Footer
 * based on the current route (standalone pages like /live, admin portals).
 * Uses market-specific navigation components for CN vs INTL versions.
 */
export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isINTL, siteConfig } = useSiteConfig();

  // Get locale from pathname
  const segments = pathname.split('/');
  const locale = (siteConfig.locales as readonly string[]).includes(segments[1]) ? segments[1] : siteConfig.defaultLocale;

  const isStandalonePage = () => {
    // Strip locale prefix: /zh/dashboard -> /dashboard
    const cleanPath = (siteConfig.locales as readonly string[]).includes(segments[1])
      ? '/' + segments.slice(2).join('/')
      : pathname;

    if (['/partners/gear', '/partners/edu', '/live'].includes(cleanPath)) return true;
    if (cleanPath === '/dashboard') {
      return user?.role && user.role !== 'Doctor';
    }
    return false;
  };

  const standalone = isStandalonePage();

  // Choose market-specific navigation components
  const NavbarComponent = isINTL ? () => <IntlNavbar locale={locale} /> : Navbar;
  const FooterComponent = isINTL ? () => <IntlFooter locale={locale} /> : Footer;

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col">
        {!standalone && <NavbarComponent />}
        <main className="flex-1">
          {children}
        </main>
        {!standalone && <FooterComponent />}
      </div>
    </>
  );
}
