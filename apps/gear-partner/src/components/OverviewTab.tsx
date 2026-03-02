'use client';

import KPICard from './KPICard';
import type { Product, Order } from '@vetsphere/shared/types';

interface OverviewTabProps {
  products: Product[];
  orders: Order[];
  onAddProduct: () => void;
}

export default function OverviewTab({ products, orders, onAddProduct }: OverviewTabProps) {
  // Calculate statistics
  const totalProducts = products.length;
  const inStockProducts = products.filter(p => p.stockStatus === 'In Stock').length;
  const lowStockProducts = products.filter(p => p.stockStatus === 'Low Stock').length;
  
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">概览</h1>
          <p className="text-gray-400 mt-1">管理您的商品和订单</p>
        </div>
        <button onClick={onAddProduct} className="gear-button flex items-center gap-2">
          <span>➕</span>
          <span>添加商品</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="商品总数"
          value={totalProducts}
          subtitle={`${inStockProducts} 个有库存`}
          color="blue"
          icon="📦"
        />
        <KPICard
          label="待发货订单"
          value={pendingOrders.length}
          subtitle="需要处理"
          color="amber"
          icon="⏳"
        />
        <KPICard
          label="总收入"
          value={`¥${totalRevenue.toLocaleString()}`}
          color="green"
          icon="💰"
        />
        <KPICard
          label="已发货"
          value={shippedOrders.length}
          subtitle="本期订单"
          color="default"
          icon="🚚"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Orders */}
        <div className="gear-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">待处理订单</h3>
          {pendingOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无待处理订单</p>
          ) : (
            <div className="space-y-3">
              {pendingOrders.slice(0, 5).map((order, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-blue-500/10 last:border-0">
                  <div>
                    <p className="text-white text-sm">{order.customerName}</p>
                    <p className="text-gray-500 text-xs">{order.items.filter(i => i.type === 'product').length} 件商品</p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-400 text-sm">¥{order.totalAmount}</p>
                    <p className="text-gray-500 text-xs">{new Date(order.date).toLocaleDateString('zh-CN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock Alerts */}
        <div className="gear-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">库存预警</h3>
          {lowStockProducts === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">✅</span>
              <p className="text-gray-500">库存充足</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.filter(p => p.stockStatus === 'Low Stock').slice(0, 5).map((product, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-blue-500/10 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-red-500/20 flex items-center justify-center">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div>
                      <p className="text-white text-sm">{product.name}</p>
                      <p className="text-red-400 text-xs">库存不足</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
