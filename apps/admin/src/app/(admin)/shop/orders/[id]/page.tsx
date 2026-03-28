'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ToastContainer, useToast } from '@/components/ui';
import {
  Package, MapPin, CreditCard, Truck, CheckCircle, XCircle, Clock, Phone, Mail,
  Building, Copy, User, ChevronLeft, DollarSign, FileText, AlertCircle
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Order {
  id: string;
  order_number: string;
  user_id: string;
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
  email: string;
  phone: string;
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
  transaction_id?: string;
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
  supplier_id?: string;
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

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待付款', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '已付款', color: 'bg-blue-100 text-blue-800' },
  processing: { label: '处理中', color: 'bg-purple-100 text-purple-800' },
  shipped: { label: '已发货', color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: '已送达', color: 'bg-green-100 text-green-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
  pending_verification: { label: '待验证', color: 'bg-orange-100 text-orange-800' },
  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-800' },
};

const paymentMethodLabels: Record<string, string> = {
  stripe: '信用卡 (Stripe)',
  paypal: 'PayPal',
  bank_transfer: '银行转账',
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { toasts, removeToast, success, error: toastError, warning } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  const [orderId, setOrderId] = useState<string>('');

  useEffect(() => {
    params.then(p => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // 获取订单项
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // 获取支付记录
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('order_id', orderId);

      if (!paymentsError) {
        setPaymentRecords(paymentsData || []);
      }

    } catch (error) {
      console.error('Failed to fetch order:', error);
      toastError('获取订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return;

    try {
      setStatusUpdating(true);
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'paid') {
        updates.paid_at = new Date().toISOString();
        updates.payment_status = 'paid';
      } else if (newStatus === 'shipped') {
        updates.shipped_at = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', order.id);

      if (error) throw error;

      success('订单状态已更新');
      fetchOrder();
    } catch (error) {
      console.error('Failed to update status:', error);
      toastError('更新状态失败');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleShip = async () => {
    if (!order || !trackingNumber.trim()) {
      warning('请输入快递单号');
      return;
    }

    try {
      setStatusUpdating(true);
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'shipped',
          tracking_number: trackingNumber.trim(),
          carrier: carrier.trim(),
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      success('订单已发货');
      setShowTrackingModal(false);
      setTrackingNumber('');
      setCarrier('');
      fetchOrder();
    } catch (error) {
      console.error('Failed to ship order:', error);
      toastError('发货失败');
    } finally {
      setStatusUpdating(false);
    }
  };

  const confirmBankTransfer = async () => {
    if (!order) return;

    try {
      setStatusUpdating(true);

      // 更新支付记录状态
      await supabase
        .from('payment_records')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString()
        })
        .eq('order_id', order.id)
        .eq('payment_method', 'bank_transfer');

      // 更新订单状态
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      success('银行转账已确认');
      fetchOrder();
    } catch (error) {
      console.error('Failed to confirm transfer:', error);
      toastError('确认失败');
    } finally {
      setStatusUpdating(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">订单未找到</p>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[order.status] || statusConfig.pending;

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/shop/orders"
            className="text-gray-400 hover:text-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              订单详情
              <span className="ml-2 text-lg font-mono">{order.order_number}</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              创建于 {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左栏：订单项和操作 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 操作按钮 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">订单操作</h3>
            <div className="flex flex-wrap gap-2">
              {order.status === 'pending' && order.payment_method === 'bank_transfer' && (
                <button
                  onClick={confirmBankTransfer}
                  disabled={statusUpdating}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  确认收款
                </button>
              )}
              {(order.status === 'paid' || order.status === 'processing') && (
                <button
                  onClick={() => setShowTrackingModal(true)}
                  disabled={statusUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  发货
                </button>
              )}
              {order.status === 'shipped' && (
                <button
                  onClick={() => updateOrderStatus('delivered')}
                  disabled={statusUpdating}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  确认送达
                </button>
              )}
              {order.status === 'delivered' && (
                <button
                  onClick={() => updateOrderStatus('completed')}
                  disabled={statusUpdating}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  完成订单
                </button>
              )}
              {!['cancelled', 'refunded', 'completed'].includes(order.status) && (
                <button
                  onClick={() => {
                    if (confirm('确定要取消此订单吗？')) {
                      updateOrderStatus('cancelled');
                    }
                  }}
                  disabled={statusUpdating}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
                >
                  取消订单
                </button>
              )}
            </div>
          </div>

          {/* 商品列表 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">商品列表</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">商品</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">单价</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">数量</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">小计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.product_name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <span className="text-sm text-gray-900">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.sku_code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatPrice(item.unit_price, item.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      {formatPrice(item.total_price, item.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 物流信息 */}
          {order.tracking_number && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4" /> 物流信息
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">快递公司:</span>
                  <span className="ml-2 text-gray-900">{order.carrier || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">快递单号:</span>
                  <span className="ml-2 font-mono text-gray-900">{order.tracking_number}</span>
                </div>
              </div>
            </div>
          )}

          {/* 备注 */}
          {order.notes && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> 订单备注
              </h3>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>

        {/* 右栏：信息卡片 */}
        <div className="space-y-6">
          {/* 价格明细 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> 价格明细
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">商品金额</span>
                <span className="text-gray-900">{formatPrice(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">运费</span>
                <span className="text-gray-900">{formatPrice(order.shipping_fee, order.currency)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">税费</span>
                  <span className="text-gray-900">{formatPrice(order.tax, order.currency)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span className="text-gray-900">总计</span>
                <span className="text-lg text-gray-900">{formatPrice(order.total, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* 支付信息 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> 支付信息
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">支付方式</span>
                <span className="text-gray-900">{paymentMethodLabels[order.payment_method] || order.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">支付状态</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.payment_status === 'paid' ? '已支付' : '待支付'}
                </span>
              </div>
              {order.paid_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">支付时间</span>
                  <span className="text-gray-900">{formatDate(order.paid_at)}</span>
                </div>
              )}
              {order.transaction_id && (
                <div className="flex justify-between">
                  <span className="text-gray-500">交易号</span>
                  <span className="font-mono text-xs text-gray-900">{order.transaction_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* 收货信息 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> 收货信息
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">{order.shipping_name}</span>
              </div>
              {order.shipping_company && (
                <div className="text-gray-600">{order.shipping_company}</div>
              )}
              <div className="text-gray-600">
                {order.shipping_address_line1}
                {order.shipping_address_line2 && <>, {order.shipping_address_line2}</>}
              </div>
              <div className="text-gray-600">
                {order.shipping_city}, {order.shipping_state || ''} {order.shipping_postal_code || ''}
              </div>
              <div className="text-gray-600">{order.shipping_country}</div>
            </div>
          </div>

          {/* B2B信息 */}
          {(order.company_name || order.po_number || order.tax_id) && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4" /> 企业信息
              </h3>
              <div className="space-y-2 text-sm">
                {order.company_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">公司名称</span>
                    <span className="text-gray-900">{order.company_name}</span>
                  </div>
                )}
                {order.po_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">PO编号</span>
                    <span className="text-gray-900">{order.po_number}</span>
                  </div>
                )}
                {order.tax_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">税号</span>
                    <span className="text-gray-900">{order.tax_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 联系信息 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">联系方式</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${order.email}`} className="text-blue-600 hover:underline">{order.email}</a>
              </div>
              {order.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${order.phone}`} className="text-blue-600 hover:underline">{order.phone}</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 发货弹窗 */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">发货信息</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">快递公司</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">请选择</option>
                  <option value="顺丰速运">顺丰速运</option>
                  <option value="中通快递">中通快递</option>
                  <option value="圆通快递">圆通快递</option>
                  <option value="申通快递">申通快递</option>
                  <option value="韵达快递">韵达快递</option>
                  <option value="EMS">EMS</option>
                  <option value="DHL">DHL</option>
                  <option value="FedEx">FedEx</option>
                  <option value="UPS">UPS</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">快递单号 *</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="请输入快递单号"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTrackingModal(false);
                  setTrackingNumber('');
                  setCarrier('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleShip}
                disabled={statusUpdating || !trackingNumber.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                确认发货
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}