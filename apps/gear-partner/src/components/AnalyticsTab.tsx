'use client';

import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  ClipboardList,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { Product, Order } from '@vetsphere/shared/types';

interface AnalyticsTabProps {
  products: Product[];
  orders: Order[];
}

export default function AnalyticsTab({ products, orders }: AnalyticsTabProps) {
  // Filter product orders
  const productOrders = orders.filter(o => o.items.some(item => item.type === 'product'));

  // Calculate revenue
  const totalRevenue = productOrders.reduce((sum, order) => {
    const productItems = order.items.filter(item => item.type === 'product');
    return sum + productItems.reduce((s, item) => s + (item.price * item.quantity), 0);
  }, 0);

  // This month's stats
  const now = new Date();
  const thisMonthOrders = productOrders.filter(o => {
    const orderDate = new Date(o.date);
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
  });
  const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => {
    const productItems = order.items.filter(item => item.type === 'product');
    return sum + productItems.reduce((s, item) => s + (item.price * item.quantity), 0);
  }, 0);

  // Last month for comparison
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
  const lastMonthOrders = productOrders.filter(o => {
    const orderDate = new Date(o.date);
    return orderDate.getMonth() === lastMonth.getMonth() && orderDate.getFullYear() === lastMonth.getFullYear();
  });
  const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => {
    const productItems = order.items.filter(item => item.type === 'product');
    return sum + productItems.reduce((s, item) => s + (item.price * item.quantity), 0);
  }, 0);

  const revenueChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  // Calculate top selling products
  const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
  productOrders.forEach(order => {
    order.items.filter(item => item.type === 'product').forEach(item => {
      if (!productSales[item.id]) {
        productSales[item.id] = { name: item.name, count: 0, revenue: 0 };
      }
      productSales[item.id].count += item.quantity;
      productSales[item.id].revenue += item.price * item.quantity;
    });
  });
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['订单ID', '客户', '邮箱', '金额', '状态', '日期'];
    const rows = productOrders.map(order => [
      order.id,
      order.customerName,
      order.customerEmail,
      order.totalAmount.toString(),
      order.status,
      new Date(order.date).toLocaleDateString('zh-CN'),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `销售报表_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const kpiCards = [
    {
      label: '总收入',
      value: `¥${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      change: revenueChange,
    },
    {
      label: '本月收入',
      value: `¥${thisMonthRevenue.toLocaleString()}`,
      subtitle: `${thisMonthOrders.length} 笔订单`,
      icon: TrendingUp,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: '商品总数',
      value: products.length,
      icon: Package,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: '总订单数',
      value: productOrders.length,
      icon: ClipboardList,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据分析</h1>
          <p className="text-gray-500 mt-1">销售数据和业绩报表</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn btn-secondary inline-flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          导出报表
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl ${kpi.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
                {kpi.change !== undefined && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${kpi.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {kpi.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span>{Math.abs(kpi.change).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
                {kpi.subtitle && <p className="text-xs text-gray-400 mt-0.5">{kpi.subtitle}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">热销商品 TOP 5</h3>
          {topProducts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无销售数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm font-medium truncate">{product.name}</p>
                    <p className="text-gray-500 text-xs">售出 {product.count} 件</p>
                  </div>
                  <span className="text-gray-900 font-semibold">
                    ¥{product.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">订单状态分布</h3>
          <div className="space-y-5">
            {[
              { key: 'Paid', label: '待发货', color: 'bg-amber-500', bgLight: 'bg-amber-50' },
              { key: 'Shipped', label: '已发货', color: 'bg-blue-500', bgLight: 'bg-blue-50' },
              { key: 'Completed', label: '已完成', color: 'bg-emerald-500', bgLight: 'bg-emerald-50' },
            ].map(({ key, label, color, bgLight }) => {
              const count = productOrders.filter(o => o.status === key).length;
              const percentage = productOrders.length ? (count / productOrders.length) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600 text-sm font-medium">{label}</span>
                    <span className="text-gray-900 text-sm font-medium">{count} 笔 ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">收入概况</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center p-5 bg-emerald-50 rounded-xl">
            <p className="text-3xl font-bold text-emerald-600">
              ¥{productOrders.filter(o => o.status === 'Completed').reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
            </p>
            <p className="text-gray-600 text-sm mt-2 font-medium">已确认收入</p>
          </div>
          <div className="text-center p-5 bg-blue-50 rounded-xl">
            <p className="text-3xl font-bold text-blue-600">
              ¥{productOrders.filter(o => o.status === 'Shipped').reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
            </p>
            <p className="text-gray-600 text-sm mt-2 font-medium">在途收入</p>
          </div>
          <div className="text-center p-5 bg-amber-50 rounded-xl">
            <p className="text-3xl font-bold text-amber-600">
              ¥{productOrders.filter(o => o.status === 'Paid').reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
            </p>
            <p className="text-gray-600 text-sm mt-2 font-medium">待发货收入</p>
          </div>
        </div>
      </div>
    </div>
  );
}
