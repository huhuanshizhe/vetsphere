'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Package, ChevronRight, Loader2, Search, Filter, Eye, XCircle, Truck, CheckCircle, Clock } from 'lucide-react';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';

interface OrdersClientProps {
  locale: string;
  initialStatus?: string;
  initialPage?: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  image_url: string;
}

export default function OrdersClient({ locale, initialStatus, initialPage }: OrdersClientProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const o = t.orders;
  const uc = t.userCenter;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState(initialStatus || 'all');
  const [currentPage, setCurrentPage] = useState(parseInt(initialPage || '1'));
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Status config for colors - labels come from translations
  const getStatusConfig = (status: string): { label: string; color: string; icon: any } => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: o.statusPending, color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      paid: { label: o.statusPaid, color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      processing: { label: o.statusProcessing, color: 'bg-purple-100 text-purple-800', icon: Package },
      shipped: { label: o.statusShipped, color: 'bg-indigo-100 text-indigo-800', icon: Truck },
      delivered: { label: o.statusDelivered, color: 'bg-green-100 text-green-800', icon: CheckCircle },
      completed: { label: o.statusDelivered, color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: o.statusCancelled, color: 'bg-red-100 text-red-800', icon: XCircle },
      pending_verification: { label: o.statusPending, color: 'bg-orange-100 text-orange-800', icon: Clock },
    };
    return configs[status] || configs.pending;
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, currentPage]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('page', currentPage.toString());
      params.append('limit', '10');

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat(locale === 'ja' ? 'ja-JP' : locale === 'th' ? 'th-TH' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'ja' ? 'ja-JP' : locale === 'th' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  // Filter button component
  const FilterButton = ({ value, label, activeColor }: { value: string; label: string; activeColor: string }) => (
    <button
      onClick={() => setStatusFilter(value)}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
        statusFilter === value
          ? `${activeColor} shadow-md`
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href={`/${locale}`} className="hover:text-slate-700 transition-colors">{t.nav.home}</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/${locale}/user`} className="hover:text-slate-700 transition-colors">{uc.userCenter}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-medium">{o.title}</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Header and Filters */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-slate-900">{o.title}</h1>
              <span className="text-slate-500 font-medium">{totalCount} orders</span>
            </div>

            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              <FilterButton value="all" label={t.common.filter} activeColor="bg-emerald-100 text-emerald-700" />
              <FilterButton value="pending" label={o.statusPending} activeColor="bg-yellow-100 text-yellow-700" />
              <FilterButton value="paid" label={o.statusPaid} activeColor="bg-blue-100 text-blue-700" />
              <FilterButton value="shipped" label={o.statusShipped} activeColor="bg-indigo-100 text-indigo-700" />
              <FilterButton value="completed" label={o.statusDelivered} activeColor="bg-green-100 text-green-700" />
            </div>
          </div>

          {/* Orders List */}
          <div className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-slate-500 text-lg mb-6">{uc.noOrdersYet}</p>
                <Link
                  href={`/${locale}/shop`}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/30"
                >
                  <Package className="w-5 h-5" />
                  {uc.browseEquipment}
                </Link>
              </div>
            ) : (
              orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/${locale}/user/orders/${order.id}`}
                  className="block p-5 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {order.order_items?.[0]?.image_url ? (
                        <Image
                          src={order.order_items[0].image_url}
                          alt={order.order_items[0].product_name}
                          fill
                          sizes="64px"
                          className="w-full h-full object-cover"
                          loading="lazy"
                          quality={75}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{order.order_number}</p>
                          <p className="text-sm text-slate-500 mt-1">{formatDate(order.created_at)}</p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="mt-3 flex items-center gap-3 text-sm">
                        <span className="text-slate-500">{order.order_items?.length || 0} {o.items.toLowerCase()}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-slate-900">
                          {formatPrice(order.total, order.currency)}
                        </span>
                      </div>

                      {order.order_items && order.order_items.length > 0 && (
                        <p className="mt-2 text-sm text-slate-500 truncate">
                          {order.order_items.map(item => item.product_name).join(', ')}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-5 border-t border-slate-200 flex items-center justify-center gap-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {t.shop.previous}
              </button>
              <span className="text-sm text-slate-500 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {t.shop.next}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}