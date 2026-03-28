'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  Package, Eye, Building, MapPin, CreditCard, Truck, CheckCircle,
  User, Mail, Phone, DollarSign, FileText, AlertCircle, ChevronLeft, X
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  shipping_fee: number;
  currency: string;
  created_at: string;
  paid_at?: string;
  shipped_at?: string;
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

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待付款', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '已付款', color: 'bg-blue-100 text-blue-800' },
  processing: { label: '处理中', color: 'bg-purple-100 text-purple-800' },
  shipped: { label: '已发货', color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: '已送达', color: 'bg-green-100 text-green-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
  pending_verification: { label: '待验证', color: 'bg-orange-100 text-orange-800' },
};

const paymentMethodLabels: Record<string, string> = {
  stripe: '信用卡 (Stripe)',
  paypal: 'PayPal',
  bank_transfer: '银行转账',
};

export default function PartnerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [updating, setUpdating] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (supplierId) {
      fetchOrders();
    }
  }, [filterStatus, supplierId]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setSupplierId(user.id);
    } catch (error) {
      console.error('Auth error:', error);
      window.location.href = '/login';
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // 获取供应商的订单（通过order_items关联）
      let query = supabase
        .from('order_items')
        .select(`
          order_id,
          supplier_id,
          orders!inner(*)
        `)
        .eq('supplier_id', supplierId);

      const { data, error } = await query;

      if (error) throw error;

      // 提取唯一订单
      const uniqueOrders: Order[] = [];
      const seenIds = new Set();

      (data || []).forEach((item: any) => {
        if (item.orders && !seenIds.has(item.orders.id)) {
          seenIds.add(item.orders.id);
          uniqueOrders.push(item.orders);
        }
      });

      // 按状态过滤
      let filteredOrders = uniqueOrders;
      if (filterStatus !== 'all') {
        filteredOrders = uniqueOrders.filter(o => o.status === filterStatus);
      }

      // 按日期排序
      filteredOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(filteredOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetail = async (orderId: string) => {
    try {
      // 获取订单项
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .eq('supplier_id', supplierId);

      if (itemsError) throw itemsError;
      setOrderItems(itemsData || []);
    } catch (error) {
      console.error('Failed to fetch order detail:', error);
    }
  };

  const openDetailModal = async (order: Order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
    await fetchOrderDetail(order.id);
  };

  const openShipModal = (order: Order) => {
    setSelectedOrder(order);
    setTrackingNumber(order.tracking_number || '');
    setCarrier(order.carrier || '');
    setShowShipModal(true);
  };

  const handleShip = async () => {
    if (!selectedOrder || !trackingNumber.trim()) {
      alert('请输入快递单号');
      return;
    }

    try {
      setUpdating(true);

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'shipped',
          tracking_number: trackingNumber.trim(),
          carrier: carrier.trim(),
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      alert('发货成功！');
      setShowShipModal(false);
      fetchOrders();
    } catch (error) {
      console.error('Failed to ship order:', error);
      alert('发货失败');
    } finally {
      setUpdating(false);
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

  // 统计
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'pending_verification').length,
    toShip: orders.filter(o => o.status === 'paid' || o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
        <p className="text-gray-600 mt-1">管理您的商品订单</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">总订单</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">待付款</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.toShip}</div>
          <div className="text-sm text-gray-500">待发货</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{stats.shipped}</div>
          <div className="text-sm text-gray-500">已发货</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="all">全部状态</option>
          <option value="pending">待付款</option>
          <option value="pending_verification">待验证</option>
          <option value="paid">已付款</option>
          <option value="processing">处理中</option>
          <option value="shipped">已发货</option>
          <option value="delivered">已送达</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">下单时间</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">支付方式</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">B2B</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  暂无订单
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const statusInfo = statusConfig[order.status] || statusConfig.pending;
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{order.shipping_name}</div>
                      <div className="text-xs text-gray-500">{order.shipping_city}, {order.shipping_country}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {paymentMethodLabels[order.payment_method] || order.payment_method}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatPrice(order.total, order.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {order.company_name ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full">
                          <Building className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => openDetailModal(order)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        详情
                      </button>
                      {(order.status === 'paid' || order.status === 'processing') && (
                        <button
                          onClick={() => openShipModal(order)}
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          发货
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 详情弹窗 */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  订单详情
                  <span className="ml-2 text-lg font-mono">{selectedOrder.order_number}</span>
                </h2>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 商品列表 */}
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">商品列表</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">商品</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">单价</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">数量</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">小计</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {orderItems.map((item) => (
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
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                                  {item.sku_code && <div className="text-xs text-gray-500">SKU: {item.sku_code}</div>}
                                </div>
                              </div>
                            </td>
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
                </div>

                {/* 收货信息 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> 收货信息
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-gray-900">{selectedOrder.shipping_name}</p>
                    {selectedOrder.shipping_company && (
                      <p className="text-gray-600">{selectedOrder.shipping_company}</p>
                    )}
                    <p className="text-gray-600">{selectedOrder.shipping_address_line1}</p>
                    {selectedOrder.shipping_address_line2 && (
                      <p className="text-gray-600">{selectedOrder.shipping_address_line2}</p>
                    )}
                    <p className="text-gray-600">
                      {selectedOrder.shipping_city}, {selectedOrder.shipping_state || ''} {selectedOrder.shipping_postal_code || ''}
                    </p>
                    <p className="text-gray-600">{selectedOrder.shipping_country}</p>
                  </div>
                </div>

                {/* B2B信息 */}
                {(selectedOrder.company_name || selectedOrder.po_number || selectedOrder.tax_id) && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Building className="w-4 h-4" /> 企业信息
                    </h3>
                    <div className="space-y-1 text-sm">
                      {selectedOrder.company_name && (
                        <p><span className="text-gray-500">公司:</span> <span className="text-gray-900">{selectedOrder.company_name}</span></p>
                      )}
                      {selectedOrder.po_number && (
                        <p><span className="text-gray-500">PO号:</span> <span className="text-gray-900">{selectedOrder.po_number}</span></p>
                      )}
                      {selectedOrder.tax_id && (
                        <p><span className="text-gray-500">税号:</span> <span className="text-gray-900">{selectedOrder.tax_id}</span></p>
                      )}
                    </div>
                  </div>
                )}

                {/* 物流信息 */}
                {selectedOrder.tracking_number && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Truck className="w-4 h-4" /> 物流信息
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">快递公司:</span> <span className="text-gray-900">{selectedOrder.carrier || '-'}</span></p>
                      <p><span className="text-gray-500">快递单号:</span> <span className="font-mono text-gray-900">{selectedOrder.tracking_number}</span></p>
                      {selectedOrder.shipped_at && (
                        <p><span className="text-gray-500">发货时间:</span> <span className="text-gray-900">{formatDate(selectedOrder.shipped_at)}</span></p>
                      )}
                    </div>
                  </div>
                )}

                {/* 备注 */}
                {selectedOrder.notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> 订单备注
                    </h3>
                    <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 发货弹窗 */}
      {showShipModal && selectedOrder && (
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
                onClick={() => setShowShipModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleShip}
                disabled={updating || !trackingNumber.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {updating ? '处理中...' : '确认发货'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}