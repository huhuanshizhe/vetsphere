'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ChevronRight } from 'lucide-react';
import { OrderStatusBadge } from './OrderStatusBadge';

/**
 * Order Item interface
 */
export interface OrderItemPreview {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  image_url?: string;
}

/**
 * Order Card data interface
 */
export interface OrderCardData {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
  items_count: number;
  items_preview?: OrderItemPreview[];
  tracking_number?: string;
}

export interface OrderCardProps {
  order: OrderCardData;
  locale: string;
  statusLabel: string;
  detailUrl: string;
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
 * formatDate - Date formatter
 */
function formatDate(dateStr: string, locale: string): string {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    th: 'th-TH',
    ja: 'ja-JP',
    zh: 'zh-CN',
  };
  return new Date(dateStr).toLocaleDateString(localeMap[locale] || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * OrderCard - Professional order list card
 * Displays order summary with status, items preview, and total
 */
export function OrderCard({
  order,
  locale,
  statusLabel,
  detailUrl,
  className = '',
}: OrderCardProps) {
  const previewItem = order.items_preview?.[0];

  return (
    <Link
      href={detailUrl}
      className={`block bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300 group ${className}`}
    >
      {/* Card Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-slate-500">
              #{order.order_number}
            </span>
            <span className="text-sm text-slate-400">
              {formatDate(order.created_at, locale)}
            </span>
          </div>
          <OrderStatusBadge status={order.status} label={statusLabel} size="md" />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Product Preview */}
          <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 relative border border-slate-200">
            {previewItem?.image_url ? (
              <Image
                src={previewItem.image_url}
                alt={previewItem.product_name}
                fill
                sizes="64px"
                className="w-full h-full object-cover"
                loading="lazy"
                quality={75}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                <Package className="w-6 h-6 text-slate-400" />
              </div>
            )}
          </div>

          {/* Order Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{order.items_count}</span>
                {order.items_count === 1 ? ' item' : ' items'}
              </p>
              <p className="text-lg font-bold text-slate-900">
                {formatPrice(order.total, order.currency, locale)}
              </p>
            </div>

            {/* Items Preview Text */}
            {order.items_preview && order.items_preview.length > 0 && (
              <p className="text-sm text-slate-500 truncate line-clamp-1">
                {order.items_preview.slice(0, 2).map((item) => item.product_name).join(', ')}
                {order.items_preview.length > 2 && ` +${order.items_preview.length - 2} more`}
              </p>
            )}

            {/* Tracking hint */}
            {order.tracking_number && order.status === 'shipped' && (
              <p className="mt-2 text-xs text-indigo-600 font-medium flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                In Transit - Track Package
              </p>
            )}
          </div>

          {/* Arrow */}
          <ChevronRight
            className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0"
          />
        </div>
      </div>
    </Link>
  );
}

export default OrderCard;