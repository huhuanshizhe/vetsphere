'use client';

import { useState } from 'react';
import DataTable from './DataTable';
import type { Order } from '@vetsphere/shared/types';

interface OrderFulfillmentTabProps {
  orders: Order[];
  onShipOrder: (orderId: string) => void;
}

export default function OrderFulfillmentTab({ orders, onShipOrder }: OrderFulfillmentTabProps) {
  const [filter, setFilter] = useState<string>('all');

  // Filter product orders only
  const productOrders = orders.filter(o => o.items.some(item => item.type === 'product'));
  
  const filteredOrders = filter === 'all'
    ? productOrders
    : productOrders.filter(o => o.status === filter);

  const pendingCount = productOrders.filter(o => o.status === 'Paid').length;
  const shippedCount = productOrders.filter(o => o.status === 'Shipped').length;

  const columns = [
    { key: 'id', label: '订单ID' },
    { key: 'customerName', label: '客户' },
    {
      key: 'items',
      label: '商品',
      render: (item: Order) => {
        const productItems = item.items.filter(i => i.type === 'product');
        return <span>{productItems.length} 件</span>;
      },
    },
    {
      key: 'totalAmount',
      label: '金额',
      render: (item: Order) => <span className="text-blue-400 font-medium">¥{item.totalAmount}</span>,
    },
    {
      key: 'status',
      label: '状态',
      render: (item: Order) => {
        const statusMap: Record<string, { bg: string; text: string; label: string }> = {
          Paid: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '待发货' },
          Shipped: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '已发货' },
          Completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: '已完成' },
          Pending: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '待支付' },
        };
        const status = statusMap[item.status] || statusMap.Pending;
        return (
          <span className={`px-2 py-1 rounded text-xs ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        );
      },
    },
    {
      key: 'date',
      label: '日期',
      render: (item: Order) => new Date(item.date).toLocaleDateString('zh-CN'),
      hideOnMobile: true,
    },
    {
      key: 'actions',
      label: '操作',
      render: (item: Order) => (
        item.status === 'Paid' ? (
          <button
            onClick={() => onShipOrder(item.id)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
          >
            发货
          </button>
        ) : (
          <span className="text-gray-500 text-xs">-</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">订单履约</h1>
        <p className="text-gray-400 mt-1">处理客户订单和发货</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="gear-card p-4 text-center">
          <p className="text-2xl font-bold text-white">{productOrders.length}</p>
          <p className="text-sm text-gray-500">总订单</p>
        </div>
        <div className="gear-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          <p className="text-sm text-gray-500">待发货</p>
        </div>
        <div className="gear-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{shippedCount}</p>
          <p className="text-sm text-gray-500">已发货</p>
        </div>
        <div className="gear-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">
            {productOrders.filter(o => o.status === 'Completed').length}
          </p>
          <p className="text-sm text-gray-500">已完成</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: '全部' },
          { key: 'Paid', label: '待发货' },
          { key: 'Shipped', label: '已发货' },
          { key: 'Completed', label: '已完成' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500/10 text-gray-400 hover:bg-blue-500/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="gear-card p-4">
        <DataTable
          data={filteredOrders}
          columns={columns}
          emptyMessage="暂无订单"
        />
      </div>
    </div>
  );
}
