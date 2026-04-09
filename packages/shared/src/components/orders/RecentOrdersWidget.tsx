'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ChevronRight, ArrowRight, Loader2 } from 'lucide-react';
import { OrderStatusBadge } from './OrderStatusBadge';

/**
 * Recent Order Item interface
 */
export interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  items_count: number;
  first_item_image?: string;
  first_item_name?: string;
}

export interface RecentOrdersWidgetProps {
  locale: string;
  orders: RecentOrder[];
  loading?: boolean;
  translations: {
    title: string;
    viewAll: string;
    noOrders: string;
    browseShop: string;
    statusPending: string;
    statusPaid: string;
    statusShipped: string;
    statusDelivered: string;
    statusCancelled: string;
    items: string;
  };
  ordersUrl: string;
  shopUrl: string;
  maxItems?: number;
  className?: string;
}

/**
 * formatPrice - Currency formatter
 */
function formatPrice(price: number, currency: string, locale: string): string {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    th: 'th-TH',
    ja: 'ja-JP',
    zh: 'zh-CN',
  };
  return new Intl.NumberFormat(localeMap[locale] || 'en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(price);
}

/**
 * formatDateShort - Short date formatter
 */
function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * RecentOrdersWidget - Quick orders preview for user center
 * Shows recent orders with "View All" link
 */
export function RecentOrdersWidget({
  locale,
  orders,
  loading = false,
  translations,
  ordersUrl,
  shopUrl,
  maxItems = 5,
  className = '',
}: RecentOrdersWidgetProps) {
  const displayOrders = orders.slice(0, maxItems);

  // Status label map
  const statusLabels: Record<string, string> = {
    pending: translations.statusPending,
    paid: translations.statusPaid,
    shipped: translations.statusShipped,
    delivered: translations.statusDelivered,
    cancelled: translations.statusCancelled,
    processing: translations.statusShipped,
    completed: translations.statusDelivered,
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{translations.title}</h2>
        </div>
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium mb-4">{translations.noOrders}</p>
          <Link
            href={shopUrl}
            className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition"
          >
            {translations.browseShop}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">{translations.title}</h2>
        <Link
          href={ordersUrl}
          className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
        >
          {translations.viewAll}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {displayOrders.map((order) => (
          <Link
            key={order.id}
            href={`${ordersUrl}/${order.id}`}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all group"
          >
            {/* Image */}
            <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
              {order.first_item_image ? (
                <Image
                  src={order.first_item_image}
                  alt={order.first_item_name || 'Order item'}
                  fill
                  sizes="48px"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  quality={60}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                  <Package className="w-5 h-5 text-slate-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-500 truncate">
                  #{order.order_number}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDateShort(order.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-slate-600">
                  {order.items_count} {translations.items}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatPrice(order.total, order.currency, locale)}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <OrderStatusBadge
              status={order.status}
              label={statusLabels[order.status] || order.status}
              size="sm"
            />

            {/* Arrow */}
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* View All Footer */}
      {orders.length > maxItems && (
        <Link
          href={ordersUrl}
          className="mt-4 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-600 hover:text-emerald-600 transition"
        >
          View {orders.length - maxItems} more orders
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

export default RecentOrdersWidget;