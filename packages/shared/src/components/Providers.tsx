'use client';

import React, { Suspense } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { LanguageProvider } from '../context/LanguageContext';
import { NotificationProvider } from '../context/NotificationContext';
import { SiteConfigProvider } from '../context/SiteConfigContext';
import type { SupportedLocale, SiteConfig } from '../site-config.types';

interface ProvidersProps {
  children: React.ReactNode;
  locale?: SupportedLocale;
  locales?: readonly SupportedLocale[];
  defaultLocale?: SupportedLocale;
  siteConfig?: SiteConfig;
}

export default function Providers({ 
  children, 
  locale = 'zh',
  locales = ['zh', 'en', 'th'] as const,
  defaultLocale = 'zh',
  siteConfig
}: ProvidersProps) {
  // Default config for backwards compatibility
  const config: SiteConfig = siteConfig || {
    market: 'intl',
    siteName: 'VetSphere',
    domain: 'vetsphere.net',
    siteUrl: 'https://vetsphere.net',
    locales: locales,
    defaultLocale: defaultLocale,
    paymentProviders: ['Stripe', 'Airwallex', 'Quote'] as const,
    defaultCurrency: 'USD',
    contactEmail: 'info@vetsphere.net',
    noreplyEmail: 'noreply@vetsphere.net',
    storagePrefix: 'vetsphere_intl_',
    organizationName: 'VetSphere',
    organizationAddress: { locality: 'Bangkok', country: 'TH' },
    features: { liveStreaming: false, aiConsultation: true, communityPosts: true },
  };

  return (
    <SiteConfigProvider config={config}>
      <AuthProvider>
        <Suspense fallback={null}>
          <LanguageProvider 
            initialLocale={locale}
            locales={locales}
            defaultLocale={defaultLocale}
          >
            <CartProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </CartProvider>
          </LanguageProvider>
        </Suspense>
      </AuthProvider>
    </SiteConfigProvider>
  );
}
