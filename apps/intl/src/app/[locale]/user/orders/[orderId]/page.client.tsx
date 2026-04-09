'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Package, ChevronRight, Loader2, MapPin, CreditCard, Truck, CheckCircle,
  Copy, ExternalLink, Building, Mail, Phone, ArrowLeft, AlertCircle, RefreshCw
} from 'lucide-react';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';
import { useNotification } from '@vetsphere/shared/context/NotificationContext';
import { OrderStatusBadge, ORDER_STATUS_CONFIG } from '@vetsphere/shared/components/orders/OrderStatusBadge';
import { OrderTimeline, generateTimelineSteps } from '@vetsphere/shared/components/orders/OrderTimeline';
import { RefundRequestModal } from '@vetsphere/shared/components/RefundRequestModal';
import { formatPrice, Currency } from '@vetsphere/shared/lib/currency';

interface OrderDetailClientProps {
  locale: string;
  orderId: string;
}

interface Order {
  id: string;
  order_number: string;
  order_no?: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  total_amount?: number;
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
  email: string;
  phone?: string;
  shipping_name: string;
  shipping_company?: string;
  shipping_country: string;
  shipping_state?: string;
  shipping_city: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_postal_code?: string;
  company_name?: string;
  po_number?: string;
  tax_id?: string;
  refund_status?: string;
  refunded_amount?: number;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  product_id?: string;
  product_name: string;
  sku_code?: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  price?: number;
  currency?: string;
  image_url?: string;
  product_image?: string;
  type?: string;
}

/**
 * OrderDetailPageClient - Professional order detail page
 * Full order information with timeline, tracking, and refund options
 */
export default function OrderDetailPageClient({ locale, orderId }: OrderDetailClientProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { addNotification } = useNotification();
  const o = t.orders;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  // Fetch order data
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

  // Copy tracking number
  const copyTrackingNumber = () => {
    if (order?.tracking_number) {
      navigator.clipboard.writeText(order.tracking_number);
      setCopied(true);
      addNotification({
        id: `copy-${Date.now()}`,
        type: 'system',
        title: 'Copied!',
        message: 'Tracking number copied to clipboard',
        read: false,
        timestamp: new Date(),
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format helpers
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'ja' ? 'ja-JP' : locale === 'th' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Status labels
  const statusLabels: Record<string, string> = {
    pending: o.statusPending,
    paid: o.statusPaid,
    processing: o.statusProcessing || o.statusShipped,
    shipped: o.statusShipped,
    delivered: o.statusDelivered,
    completed: o.statusDelivered,
    cancelled: o.statusCancelled,
  };

  // Payment method labels
  const paymentMethodLabels: Record<string, string> = {
    stripe: o.paymentStripe,
    paypal: o.paymentPaypal,
    bank_transfer: o.paymentBank,
  };

  // Get currency safely
  const getCurrency = (currency: string): Currency => {
    const validCurrencies: Currency[] = ['USD', 'CNY', 'JPY', 'THB'];
    return validCurrencies.includes(currency as Currency) ? currency as Currency : 'USD';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium mb-2">{error || o.notFound}</p>
          <Link
            href={`/${locale}/user/orders`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {o.backToOrders}
          </Link>
        </div>
      </div>
    );
  }

  const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
  const timelineSteps = generateTimelineSteps(
    order.status,
    {
      created_at: order.created_at,
      paid_at: order.paid_at,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
    },
    o.timeline
  );

  // Check if refund is available
  const canRequestRefund = ['paid', 'shipped'].includes(order.status) && !order.refund_status;

  // Build items for refund modal
  const refundOrderData = {
    id: order.id,
    totalAmount: order.total_amount || order.total || 0,
    currency: order.currency,
    refunded_amount: order.refunded_amount || 0,
    items: order.order_items?.map((item) => ({
      id: item.product_id || item.id,
      name: item.product_name,
      price: item.unit_price || item.price || 0,
      quantity: item.quantity,
      type: item.type || 'product',
    })) || [],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href={`/${locale}`} className="hover:text-slate-700 transition font-medium">
            {t.nav.home}
          </Link>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <Link href={`/${locale}/user`} className="hover:text-slate-700 transition font-medium">
            {t.userCenter.userCenter}
          </Link>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <Link href={`/${locale}/user/orders`} className="hover:text-slate-700 transition font-medium">
            {o.title}
          </Link>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <span className="text-slate-900 font-semibold">{order.order_number || order.order_no}</span>
        </nav>

        {/* Order Status Header */}
        <div className={`rounded-2xl p-6 mb-6 border ${config.bgClass} ${config.borderClass}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <OrderStatusBadge
                  status={order.status}
                  label={statusLabels[order.status] || order.status}
                  size="lg"
                />
                {order.refund_status && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    order.refund_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    order.refund_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {order.refund_status === 'pending' ? 'Refund Pending' :
                     order.refund_status === 'approved' ? 'Refund Approved' :
                     order.refund_status}
                  </span>
                )}
              </div>
              <p className="text-slate-600 font-medium">
                Order #{order.order_number || order.order_no}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {o.orderDate}: {formatDate(order.created_at)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {canRequestRefund && (
                <button
                  onClick={() => setShowRefundModal(true)}
                  className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 transition"
                >
                  Request Refund
                </button>
              )}
              {order.tracking_number && (
                <a
                  href={`https://track.aftership.com/${order.tracking_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition inline-flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Track Package
                </a>
              )}
            </div>
          </div>

          {/* Timeline - Only show for non-cancelled orders */}
          {order.status !== 'cancelled' && (
            <div className="mt-6 pt-6 border-t border-slate-200/50">
              <OrderTimeline steps={timelineSteps} compact />
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Items and Tracking */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items List */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">{o.items}</h2>
              </div>
              <div className="p-5 space-y-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    {/* Item Image */}
                    <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 relative border border-slate-200">
                      {item.image_url || item.product_image ? (
                        <Image
                          src={item.image_url || item.product_image || ''}
                          alt={item.product_name}
                          fill
                          sizes="80px"
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

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      {item.product_id && (
                        <Link
                          href={`/${locale}/product/${item.product_id}`}
                          className="font-semibold text-slate-900 hover:text-emerald-600 transition"
                        >
                          {item.product_name}
                        </Link>
                      )}
                      {!item.product_id && (
                        <p className="font-semibold text-slate-900">{item.product_name}</p>
                      )}
                      {item.sku_code || item.product_sku && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          SKU: {item.sku_code || item.product_sku}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="text-slate-500">{o.qty} {item.quantity}</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-medium text-slate-700">
                          {formatPrice(item.unit_price, getCurrency(order.currency))}
                        </span>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        {formatPrice((item.total_price || (item.unit_price * item.quantity)), getCurrency(order.currency))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking Info */}
            {order.tracking_number && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-500" />
                    {o.tracking}
                  </h2>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{o.carrier}</p>
                      <p className="font-bold text-slate-900">{order.carrier || 'Standard Shipping'}</p>
                      <p className="font-mono text-lg font-bold text-indigo-600 mt-2">
                        {order.tracking_number}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={copyTrackingNumber}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                          copied
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {copied ? o.copied : o.copy}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order Notes */}
            {order.notes && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-lg font-bold text-slate-900 mb-3">{o.orderNotes}</h2>
                <p className="text-slate-600">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Summary and Info */}
          <div className="space-y-6">
            {/* Price Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">{o.summary}</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{o.subtotal}</span>
                  <span className="font-medium text-slate-700">
                    {formatPrice(order.subtotal, getCurrency(order.currency))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{o.shipping}</span>
                  <span className={`font-medium ${order.shipping_fee === 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {order.shipping_fee === 0 ? 'Free' : formatPrice(order.shipping_fee, getCurrency(order.currency))}
                  </span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{o.tax}</span>
                    <span className="font-medium text-slate-700">
                      {formatPrice(order.tax, getCurrency(order.currency))}
                    </span>
                  </div>
                )}
                {order.refunded_amount && order.refunded_amount > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                    <span className="text-emerald-600">Refunded</span>
                    <span className="font-medium text-emerald-600">
                      -{formatPrice(order.refunded_amount, getCurrency(order.currency))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-slate-200">
                  <span className="font-bold text-slate-900">{o.total}</span>
                  <span className="text-xl font-bold text-slate-900">
                    {formatPrice(order.total_amount || order.total, getCurrency(order.currency))}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  {o.payment}
                </h2>
              </div>
              <div className="p-5">
                <p className="font-medium text-slate-900">
                  {paymentMethodLabels[order.payment_method] || order.payment_method}
                </p>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    order.payment_status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                  {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </p>
                {order.payment_method === 'bank_transfer' && order.status === 'pending' && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    {o.bankTransferNote}
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  {o.shippingAddress}
                </h2>
              </div>
              <div className="p-5 text-sm space-y-1">
                <p className="font-semibold text-slate-900">{order.shipping_name}</p>
                {order.shipping_company && <p className="text-slate-600">{order.shipping_company}</p>}
                <p className="text-slate-600">{order.shipping_address_line1}</p>
                {order.shipping_address_line2 && <p className="text-slate-600">{order.shipping_address_line2}</p>}
                <p className="text-slate-600">
                  {order.shipping_city}, {order.shipping_state || ''} {order.shipping_postal_code || ''}
                </p>
                <p className="text-slate-600">{order.shipping_country}</p>
              </div>
            </div>

            {/* Business Info */}
            {(order.company_name || order.po_number || order.tax_id) && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-purple-500" />
                    {o.businessInfo}
                  </h2>
                </div>
                <div className="p-5 text-sm space-y-1">
                  {order.company_name && (
                    <p className="text-slate-600">
                      <span className="font-medium text-slate-900">Company:</span> {order.company_name}
                    </p>
                  )}
                  {order.po_number && (
                    <p className="text-slate-600">
                      <span className="font-medium text-slate-900">PO Number:</span> {order.po_number}
                    </p>
                  )}
                  {order.tax_id && (
                    <p className="text-slate-600">
                      <span className="font-medium text-slate-900">Tax ID:</span> {order.tax_id}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">{o.contact}</h2>
              </div>
              <div className="p-5 text-sm space-y-3">
                <p className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {order.email}
                </p>
                {order.phone && (
                  <p className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {order.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Back to Orders Link */}
        <div className="mt-8 text-center">
          <Link
            href={`/${locale}/user/orders`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {o.backToOrders}
          </Link>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <RefundRequestModal
          order={refundOrderData as any}
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          onSuccess={() => {
            setShowRefundModal(false);
            fetchOrder(); // Refresh order data
          }}
          locale={locale}
        />
      )}
    </div>
  );
}