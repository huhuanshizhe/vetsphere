'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';
import { OrdersList } from '@vetsphere/shared/components/orders';

interface OrdersClientProps {
  locale: string;
  initialStatus?: string;
  initialPage?: string;
}

/**
 * OrdersPageClient - Professional orders list page
 * Uses shared OrdersList component with consistent UI/UX
 */
export default function OrdersPageClient({ locale, initialStatus, initialPage }: OrdersClientProps) {
  const { t } = useLanguage();
  const o = t.orders;
  const c = t.common;
  const s = t.shop;

  // Build translations object for OrdersList
  const ordersTranslations = {
    title: o.title,
    all: c.all || 'All',
    pending: o.statusPending,
    paid: o.statusPaid,
    shipped: o.statusShipped,
    delivered: o.statusDelivered,
    cancelled: o.statusCancelled,
    statusPending: o.statusPending,
    statusPaid: o.statusPaid,
    statusShipped: o.statusShipped,
    statusDelivered: o.statusDelivered,
    statusCancelled: o.statusCancelled,
    noOrders: t.userCenter.noOrdersYet || 'No orders yet',
    noOrdersDesc: 'Start shopping to see your orders here',
    browseShop: t.userCenter.browseEquipment || 'Browse Equipment',
    previous: s.previous || 'Previous',
    next: s.next || 'Next',
    showing: 'Page',
    of: 'of',
    orders: 'orders',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link
            href={`/${locale}`}
            className="hover:text-slate-700 transition-colors font-medium"
          >
            {t.nav.home}
          </Link>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <Link
            href={`/${locale}/user`}
            className="hover:text-slate-700 transition-colors font-medium"
          >
            {t.userCenter.userCenter}
          </Link>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <span className="text-slate-900 font-semibold">{o.title}</span>
        </nav>

        {/* Orders List Component */}
        <OrdersList
          locale={locale}
          translations={ordersTranslations}
          ordersUrl={`/${locale}/user/orders`}
          shopUrl={`/${locale}/shop`}
          detailUrlTemplate="/{locale}/user/orders/{orderId}"
          initialStatus={initialStatus || 'all'}
          initialPage={parseInt(initialPage || '1')}
        />
      </div>
    </div>
  );
}