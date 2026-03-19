'use client';

import { useState } from 'react';
import {
  Truck,
  Clock,
  CheckCircle,
  Package,
  Search,
  Download,
} from 'lucide-react';
import type { Order } from '@vetsphere/shared/types';

interface OrderFulfillmentTabProps {
  orders: Order[];
  onShipOrder: (orderId: string) => void;
}

const STATUS_CONFIG = {
  Paid: { bg: 'bg-amber-50', text: 'text-amber-700', label: '待发货', icon: Clock },
  Shipped: { bg: 'bg-blue-50', text: 'text-blue-700', label: '已发货', icon: Truck },
  Completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '已完成', icon: CheckCircle },
  Pending: { bg: 'bg-gray-100', text: 'text-gray-600', label: '待支付', icon: Package },
};

export default function OrderFulfillmentTab({ orders, onShipOrder }: OrderFulfillmentTabProps) {
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const productOrders = orders.filter(o => o.items.some(item => item.type === 'product'));

  const filteredOrders = productOrders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const matchesSearch = o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = productOrders.filter(o => o.status === 'Paid').length;
  const shippedCount = productOrders.filter(o => o.status === 'Shipped').length;
  const completedCount = productOrders.filter(o => o.status === 'Completed').length;

  const filterButtons = [
    { key: 'all', label: '全部', count: productOrders.length },
    { key: 'Paid', label: '待发货', count: pendingCount },
    { key: 'Shipped', label: '已发货', count: shippedCount },
    { key: 'Completed', label: '已完成', count: completedCount },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">订单履约</h1>
        <p className="text-gray-500 mt-1">处理客户订单和发货</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{productOrders.length}</p>
              <p className="text-sm text-gray-500">总订单</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-sm text-gray-500">待发货</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{shippedCount}</p>
              <p className="text-sm text-gray-500">已发货</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
              <p className="text-sm text-gray-500">已完成</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索订单ID、客户名称..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {filterButtons.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  filter === key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
                <span className={`ml-1.5 ${filter === key ? 'text-blue-200' : 'text-gray-400'}`}>
                  ({count})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500">暂无订单</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">订单ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">客户</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">商品</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">金额</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">日期</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;
                  const StatusIcon = status.icon;
                  const productItems = order.items.filter(i => i.type === 'product');

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-medium text-gray-900">#{order.id.slice(-6)}</td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                          <p className="text-xs text-gray-500">{order.customerEmail}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{productItems.length} 件</td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900">¥{order.totalAmount.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500 hidden lg:table-cell">
                        {new Date(order.date).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="py-4 px-4">
                        {order.status === 'Paid' ? (
                          <button
                            onClick={() => onShipOrder(order.id)}
                            className="btn btn-primary btn-sm"
                          >
                            发货
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
