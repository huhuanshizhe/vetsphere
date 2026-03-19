'use client';

import { useState } from 'react';
import {
  Package,
  Truck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  MoreHorizontal,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { Product, Order } from '@vetsphere/shared/types';

interface OverviewTabProps {
  products: Product[];
  orders: Order[];
  onAddProduct: () => void;
}

interface KPICardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  iconBg: string;
}

function KPICard({ label, value, change, icon, iconBg }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function OverviewTab({ products, orders, onAddProduct }: OverviewTabProps) {
  // Calculate statistics
  const totalProducts = products.length;
  const inStockProducts = products.filter(p => p.stockStatus === 'In Stock').length;
  const lowStockProducts = products.filter(p => p.stockStatus === 'Low Stock').length;
  const pendingProducts = products.filter(p => p.status === 'Pending').length;

  // Filter product orders
  const productOrders = orders.filter(o => o.items.some(item => item.type === 'product'));
  const pendingOrders = productOrders.filter(o => o.status === 'Paid');
  const shippedOrders = productOrders.filter(o => o.status === 'Shipped');

  // Calculate revenue
  const totalRevenue = productOrders.reduce((sum, order) => {
    const productItems = order.items.filter(item => item.type === 'product');
    return sum + productItems.reduce((s, item) => s + (item.price * item.quantity), 0);
  }, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作台</h1>
          <p className="text-gray-500 mt-1">欢迎回来，查看您的业务概况</p>
        </div>
        <button
          onClick={onAddProduct}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加商品
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="商品总数"
          value={totalProducts}
          change={12}
          icon={<Package className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <KPICard
          label="待发货订单"
          value={pendingOrders.length}
          change={-5}
          icon={<Truck className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <KPICard
          label="本月收入"
          value={`¥${totalRevenue.toLocaleString()}`}
          change={23}
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <KPICard
          label="已发货"
          value={shippedOrders.length}
          icon={<CheckCircle className="w-5 h-5 text-slate-600" />}
          iconBg="bg-slate-100"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pending Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">待处理订单</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              查看全部
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingOrders.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500">暂无待处理订单</p>
              </div>
            ) : (
              pendingOrders.slice(0, 5).map((order, idx) => (
                <div key={idx} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{order.customerName}</p>
                      <p className="text-sm text-gray-500">
                        {order.items.filter(i => i.type === 'product').length} 件商品
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">¥{order.totalAmount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{new Date(order.date).toLocaleDateString('zh-CN')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">库存预警</h3>
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
              {lowStockProducts} 项
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {lowStockProducts === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-gray-500">库存状态良好</p>
              </div>
            ) : (
              products
                .filter(p => p.stockStatus === 'Low Stock')
                .slice(0, 4)
                .map((product, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate text-sm">{product.name}</p>
                      <p className="text-xs text-red-600">库存不足</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">快捷操作</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={onAddProduct}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">添加商品</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <Truck className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">订单发货</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">库存盘点</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">销售报表</span>
          </button>
        </div>
      </div>
    </div>
  );
}
