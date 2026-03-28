'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ToastContainer, useToast } from '@/components/ui';
import { Package, Eye, Building, AlertCircle } from 'lucide-react';

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
  currency: string;
  created_at: string;
  updated_at: string;
  company_name?: string;
  po_number?: string;
  email: string;
  shipping_name: string;
  shipping_city: string;
  shipping_country: string;
}

export default function AdminShopOrdersPage() {
  const { toasts, removeToast, success, error: toastError, warning } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchOrders();
  }, [page, filterStatus, filterPayment]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterPayment !== 'all') {
        query = query.eq('payment_method', filterPayment);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      setOrders(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toastError('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      pending_verification: 'bg-orange-100 text-orange-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待付款',
      paid: '已付款',
      processing: '处理中',
      shipped: '已发货',
      delivered: '已送达',
      completed: '已完成',
      cancelled: '已取消',
      pending_verification: '待验证',
      refunded: '已退款'
    };
    return labels[status] || status;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      stripe: '信用卡',
      paypal: 'PayPal',
      bank_transfer: '银行转账'
    };
    return labels[method] || method;
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  // 统计数据
  const stats = {
    total: total,
    pending: orders.filter(o => o.status === 'pending').length,
    pendingVerification: orders.filter(o => o.status === 'pending_verification').length,
    b2b: orders.filter(o => o.company_name).length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
        <p className="text-gray-600 mt-1">查看所有订单并管理订单状态</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-500">总订单数</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">待付款</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.pendingVerification}</div>
          <div className="text-sm text-gray-500">待验证支付</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.b2b}</div>
          <div className="text-sm text-gray-500">B2B订单</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
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
          <option value="refunded">已退款</option>
        </select>

        <select
          value={filterPayment}
          onChange={(e) => {
            setFilterPayment(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="all">全部支付方式</option>
          <option value="stripe">信用卡 (Stripe)</option>
          <option value="paypal">PayPal</option>
          <option value="bank_transfer">银行转账</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户信息</th>
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
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mr-2"></div>
                    加载中...
                  </div>
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
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{order.shipping_name}</div>
                    <div className="text-xs text-gray-500">{order.email}</div>
                    <div className="text-xs text-gray-400">{order.shipping_city}, {order.shipping_country}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {getPaymentMethodLabel(order.payment_method)}
                    {order.payment_method === 'bank_transfer' && order.status === 'pending_verification' && (
                      <span className="ml-1 inline-flex items-center text-orange-500">
                        <AlertCircle className="w-3 h-3" />
                      </span>
                    )}
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
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    <Link
                      href={`/shop/orders/${order.id}`}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-900"
                    >
                      <Eye className="w-4 h-4" />
                      详情
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-700">
          共 {total} 个订单，第 {page} 页 / 共 {Math.ceil(total / limit)} 页
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}