'use client';

import KPICard from './KPICard';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">数据分析</h1>
          <p className="text-gray-400 mt-1">销售数据和业绩报表</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg flex items-center gap-2 transition-colors"
        >
          <span>📥</span>
          <span>导出报表</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="总收入"
          value={`¥${totalRevenue.toLocaleString()}`}
          color="blue"
          icon="💰"
        />
        <KPICard
          label="本月收入"
          value={`¥${thisMonthRevenue.toLocaleString()}`}
          subtitle={`${thisMonthOrders.length} 笔订单`}
          color="green"
          icon="📈"
        />
        <KPICard
          label="商品总数"
          value={products.length}
          color="default"
          icon="📦"
        />
        <KPICard
          label="总订单数"
          value={productOrders.length}
          color="default"
          icon="📋"
        />
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="gear-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">热销商品 TOP 5</h3>
          {topProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无销售数据</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-medium">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{product.name}</p>
                    <p className="text-gray-500 text-xs">售出 {product.count} 件</p>
                  </div>
                  <span className="text-blue-400 font-medium">
                    ¥{product.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Status Distribution */}
        <div className="gear-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">订单状态分布</h3>
          <div className="space-y-4">
            {[
              { key: 'Paid', label: '待发货', color: 'amber' },
              { key: 'Shipped', label: '已发货', color: 'blue' },
              { key: 'Completed', label: '已完成', color: 'green' },
            ].map(({ key, label, color }) => {
              const count = productOrders.filter(o => o.status === key).length;
              const percentage = productOrders.length ? (count / productOrders.length) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400 text-sm">{label}</span>
                    <span className="text-white text-sm">{count} 笔 ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        color === 'amber' ? 'bg-amber-500' :
                        color === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                      }`}
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
      <div className="gear-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">收入概况</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-500/10 rounded-lg">
            <p className="text-3xl font-bold text-green-400">
              ¥{productOrders.filter(o => o.status === 'Completed').reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
            </p>
            <p className="text-gray-500 text-sm mt-1">已确认收入</p>
          </div>
          <div className="text-center p-4 bg-blue-500/10 rounded-lg">
            <p className="text-3xl font-bold text-blue-400">
              ¥{productOrders.filter(o => o.status === 'Shipped').reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
            </p>
            <p className="text-gray-500 text-sm mt-1">在途收入</p>
          </div>
          <div className="text-center p-4 bg-amber-500/10 rounded-lg">
            <p className="text-3xl font-bold text-amber-400">
              ¥{productOrders.filter(o => o.status === 'Paid').reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
            </p>
            <p className="text-gray-500 text-sm mt-1">待发货收入</p>
          </div>
        </div>
      </div>
    </div>
  );
}
