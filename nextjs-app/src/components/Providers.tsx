'use client';

import React, { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { Locale } from '@/middleware';

interface ProvidersProps {
  children: React.ReactNode;
  locale?: Locale;
}

export default function Providers({ children, locale = 'zh' }: ProvidersProps) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <LanguageProvider initialLocale={locale}>
          <CartProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </CartProvider>
        </LanguageProvider>
      </Suspense>
    </AuthProvider>
  );
}
