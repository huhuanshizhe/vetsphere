'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Package, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { OrderCard, OrderCardData } from './OrderCard';
import { OrderFilters, FilterOption, getDefaultFilterOptions } from './OrderFilters';
import { getSessionSafe } from '@vetsphere/shared/services/supabase';

/**
 * Pagination info interface
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * OrdersList Props
 */
export interface OrdersListProps {
  locale: string;
  translations: {
    title: string;
    all: string;
    pending: string;
    paid: string;
    shipped: string;
    delivered: string;
    cancelled: string;
    statusPending: string;
    statusPaid: string;
    statusShipped: string;
    statusDelivered: string;
    statusCancelled: string;
    noOrders: string;
    noOrdersDesc: string;
    browseShop: string;
    previous: string;
    next: string;
    showing: string;
    of: string;
    orders: string;
  };
  ordersUrl: string;
  shopUrl: string;
  detailUrlTemplate: string; // e.g. "/{locale}/user/orders/{orderId}"
  initialStatus?: string;
  initialPage?: number;
  className?: string;
}

/**
 * OrdersList - Professional order list with filtering and pagination
 * Main component for the orders page
 */
export function OrdersList({
  locale,
  translations,
  ordersUrl,
  shopUrl,
  detailUrlTemplate,
  initialStatus = 'all',
  initialPage = 1,
  className = '',
}: OrdersListProps) {
  const [orders, setOrders] = useState<OrderCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Filter options
  const filterOptions: FilterOption[] = getDefaultFilterOptions({
    all: translations.all,
    pending: translations.pending,
    paid: translations.paid,
    shipped: translations.shipped,
    delivered: translations.delivered,
    cancelled: translations.cancelled,
  });

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

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get session token for authentication
      const { data: { session } } = await getSessionSafe();
      if (!session?.access_token) {
        setError('Please login to view orders');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('page', currentPage.toString());
      params.append('limit', '10');

      const response = await fetch(`/api/orders?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();

      // Transform data to OrderCardData format
      const transformedOrders: OrderCardData[] = (data.orders || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number || order.order_no || order.id.slice(0, 8),
        status: order.status,
        payment_status: order.payment_status,
        total: order.total || order.total_amount || 0,
        currency: order.currency || 'USD',
        created_at: order.created_at,
        items_count: order.order_items?.length || 0,
        items_preview: order.order_items?.slice(0, 3).map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          image_url: item.image_url || item.product_image,
        })),
        tracking_number: order.tracking_number,
      }));

      setOrders(transformedOrders);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currentPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle filter change
  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Get detail URL
  const getDetailUrl = (orderId: string) => {
    return detailUrlTemplate
      .replace('{locale}', locale)
      .replace('{orderId}', orderId);
  };

  // Loading state
  if (loading && orders.length === 0) {
    return (
      <div className={`flex items-center justify-center py-20 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-slate-600 font-medium">{error}</p>
        <button
          onClick={fetchOrders}
          className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className={`${className}`}>
        <OrderFilters
          options={filterOptions}
          activeFilter={statusFilter}
          onFilterChange={handleFilterChange}
        />
        <div className="mt-8 text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-slate-500 text-lg font-medium">{translations.noOrders}</p>
          <p className="text-slate-400 text-sm mt-2 mb-6">{translations.noOrdersDesc}</p>
          <Link
            href={shopUrl}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/30"
          >
            <Package className="w-5 h-5" />
            {translations.browseShop}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{translations.title}</h1>
        <span className="text-slate-500 font-medium">
          {pagination.total} {translations.orders}
        </span>
      </div>

      {/* Filters */}
      <OrderFilters
        options={filterOptions}
        activeFilter={statusFilter}
        onFilterChange={handleFilterChange}
        className="mb-6"
      />

      {/* Orders Grid */}
      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            locale={locale}
            statusLabel={statusLabels[order.status] || order.status}
            detailUrl={getDetailUrl(order.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            {translations.previous}
          </button>

          <div className="text-sm text-slate-500 font-medium">
            {translations.showing} {currentPage} {translations.of} {pagination.totalPages}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage >= pagination.totalPages}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {translations.next}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default OrdersList;