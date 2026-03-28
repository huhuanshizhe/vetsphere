'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package, ChevronRight, Loader2, MapPin, CreditCard, Truck, CheckCircle, XCircle,
  Clock, Phone, Mail, Building, Copy, ExternalLink
} from 'lucide-react';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';

interface OrderDetailClientProps {
  locale: string;
  orderId: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  shipping_fee: number;
  tax: number;
  currency: string;
  created_at: string;
  paid_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  tracking_number?: string;
  carrier?: string;
  notes?: string;
  // 联系信息
  email: string;
  phone: string;
  // 收货地址
  shipping_name: string;
  shipping_company?: string;
  shipping_country: string;
  shipping_state?: string;
  shipping_city: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_postal_code?: string;
  // B2B信息
  company_name?: string;
  po_number?: string;
  tax_id?: string;
  // 订单项
  order_items: OrderItem[];
  // 支付记录
  payment_records?: PaymentRecord[];
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  sku_code?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  image_url?: string;
}

interface PaymentRecord {
  id: string;
  payment_method: string;
  status: string;
  amount: number;
  currency: string;
  transaction_id?: string;
  paid_at?: string;
  metadata?: any;
}

// Status colors only - labels come from translations
const statusColors: Record<string, { color: string; bgColor: string }> = {
  pending: { color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  paid: { color: 'text-blue-700', bgColor: 'bg-blue-50' },
  processing: { color: 'text-purple-700', bgColor: 'bg-purple-50' },
  shipped: { color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  delivered: { color: 'text-green-700', bgColor: 'bg-green-50' },
  completed: { color: 'text-green-700', bgColor: 'bg-green-50' },
  cancelled: { color: 'text-red-700', bgColor: 'bg-red-50' },
  pending_verification: { color: 'text-orange-700', bgColor: 'bg-orange-50' },
};

export default function OrderDetailClient({ locale, orderId }: OrderDetailClientProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const o = t.orders;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Get status label from translations
  const getStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      pending: o.statusPending,
      paid: o.statusPaid,
      processing: o.statusProcessing,
      shipped: o.statusShipped,
      delivered: o.statusDelivered,
      completed: o.statusDelivered, // completed same as delivered
      cancelled: o.statusCancelled,
      pending_verification: o.statusPending, // fallback
    };
    return statusLabels[status] || status;
  };

  // Get payment method label from translations
  const getPaymentMethodLabel = (method: string): string => {
    const methodKey = `payment${method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, '')}` as keyof typeof o;
    // Handle special cases
    if (method === 'stripe') return o.paymentStripe;
    if (method === 'paypal') return o.paymentPaypal;
    if (method === 'bank_transfer') return o.paymentBank;
    return method;
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (err: any) {
      console.error('Failed to fetch order:', err);
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'ja' ? 'ja-JP' : locale === 'th' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyTrackingNumber = () => {
    if (order?.tracking_number) {
      navigator.clipboard.writeText(order.tracking_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusTimeline = () => {
    const statuses = [
      { key: 'pending', label: o.timeline.placed, date: order?.created_at },
      { key: 'paid', label: o.timeline.confirmed, date: order?.paid_at },
      { key: 'shipped', label: o.timeline.shipped, date: order?.shipped_at },
      { key: 'delivered', label: o.timeline.delivered, date: order?.delivered_at },
    ];

    const currentIndex = statuses.findIndex(s => s.key === order?.status) + 1;

    return statuses.map((status, index) => ({
      ...status,
      completed: index < currentIndex || order?.status === 'completed',
      current: status.key === order?.status,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{error || o.notFound}</p>
          <Link
            href={`/${locale}/user/orders`}
            className="mt-4 inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            {o.backToOrders}
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = statusColors[order.status] || statusColors.pending;
  const timeline = getStatusTimeline();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 面包屑 */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}`} className="hover:text-gray-700">{t.nav.home}</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/${locale}/user`} className="hover:text-gray-700">{t.userCenter.userCenter}</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/${locale}/user/orders`} className="hover:text-gray-700">{o.title}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">{order.order_number}</span>
        </nav>

        {/* 订单状态头部 */}
        <div className={`rounded-xl p-6 mb-6 ${statusInfo.bgColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${statusInfo.color}`}>
                {getStatusLabel(order.status)}
              </h1>
              <p className="mt-1 text-gray-600">Order #{order.order_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{o.orderDate}</p>
              <p className="font-medium text-gray-900">{formatDate(order.created_at)}</p>
            </div>
          </div>

          {/* 订单进度时间线 */}
          {order.status !== 'cancelled' && (
            <div className="mt-6 flex items-center justify-between">
              {timeline.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : step.current
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {step.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    <p className={`mt-1 text-xs ${
                      step.completed || step.current ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                  {index < timeline.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`} style={{ width: '60px' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左栏：订单项 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 商品列表 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">{o.items}</h2>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/${locale}/product/${item.product_id}`}
                        className="font-medium text-gray-900 hover:text-emerald-600"
                      >
                        {item.product_name}
                      </Link>
                      {item.sku_code && (
                        <p className="text-sm text-gray-500">{t.cart.sku} {item.sku_code}</p>
                      )}
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                        <span>{o.qty} {item.quantity}</span>
                        <span>{formatPrice(item.unit_price, item.currency)} {o.each}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatPrice(item.total_price, item.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 物流追踪 */}
            {order.tracking_number && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5" /> {o.tracking}
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">{o.carrier} {order.carrier || 'N/A'}</p>
                    <p className="font-mono font-medium text-gray-900">{order.tracking_number}</p>
                  </div>
                  <button
                    onClick={copyTrackingNumber}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    {copied ? o.copied : o.copy}
                  </button>
                </div>
              </div>
            )}

            {/* 订单备注 */}
            {order.notes && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">{o.orderNotes}</h2>
                <p className="text-gray-600">{order.notes}</p>
              </div>
            )}
          </div>

          {/* 右栏：订单信息 */}
          <div className="space-y-6">
            {/* 价格明细 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">{o.summary}</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{o.subtotal}</span>
                  <span>{formatPrice(order.subtotal, order.currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{o.shipping}</span>
                  <span>{formatPrice(order.shipping_fee, order.currency)}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{o.tax}</span>
                    <span>{formatPrice(order.tax, order.currency)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>{o.total}</span>
                    <span>{formatPrice(order.total, order.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 支付信息 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> {o.payment}
              </h2>
              <p className="text-gray-600">{getPaymentMethodLabel(order.payment_method)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {o.status} <span className="capitalize">{order.payment_status}</span>
              </p>
              {order.payment_method === 'bank_transfer' && order.status === 'pending' && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                  {o.bankTransferNote}
                </div>
              )}
            </div>

            {/* 收货地址 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" /> {o.shippingAddress}
              </h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">{order.shipping_name}</p>
                {order.shipping_company && <p>{order.shipping_company}</p>}
                <p>{order.shipping_address_line1}</p>
                {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
                <p>
                  {order.shipping_city}, {order.shipping_state || ''} {order.shipping_postal_code || ''}
                </p>
                <p>{order.shipping_country}</p>
              </div>
            </div>

            {/* B2B信息 */}
            {(order.company_name || order.po_number || order.tax_id) && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5" /> {o.businessInfo}
                </h2>
                <div className="text-sm text-gray-600 space-y-1">
                  {order.company_name && <p><span className="font-medium">Company:</span> {order.company_name}</p>}
                  {order.po_number && <p><span className="font-medium">PO Number:</span> {order.po_number}</p>}
                  {order.tax_id && <p><span className="font-medium">Tax ID:</span> {order.tax_id}</p>}
                </div>
              </div>
            )}

            {/* 联系信息 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">{o.contact}</h2>
              <div className="text-sm text-gray-600 space-y-2">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> {order.email}
                </p>
                {order.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> {order.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}