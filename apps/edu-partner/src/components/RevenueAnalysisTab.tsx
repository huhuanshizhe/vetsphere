'use client';

import KPICard from './KPICard';
import DataTable from './DataTable';
import type { Order } from '@vetsphere/shared/types';

interface RevenueAnalysisTabProps {
  orders: Order[];
}

export default function RevenueAnalysisTab({ orders }: RevenueAnalysisTabProps) {
  // Filter course orders only
  const courseOrders = orders.filter(o => o.items.some(item => item.type === 'course'));
  
  // Calculate revenue
  const totalRevenue = courseOrders.reduce((sum, order) => {
    const courseItems = order.items.filter(item => item.type === 'course');
    return sum + courseItems.reduce((s, item) => s + (item.price * item.quantity), 0);
  }, 0);

  // This month's revenue
  const now = new Date();
  const thisMonthOrders = courseOrders.filter(o => {
    const orderDate = new Date(o.date);
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
  });
  const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => {
    const courseItems = order.items.filter(item => item.type === 'course');
    return sum + courseItems.reduce((s, item) => s + (item.price * item.quantity), 0);
  }, 0);

  // Paid orders
  const paidOrders = courseOrders.filter(o => o.status === 'Paid' || o.status === 'Completed');
  const pendingOrders = courseOrders.filter(o => o.status === 'Pending');

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['订单ID', '客户', '邮箱', '金额', '状态', '日期'];
    const rows = courseOrders.map(order => [
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
    link.download = `财务报表_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const columns = [
    { key: 'id', label: '订单ID' },
    { key: 'customerName', label: '客户' },
    { key: 'customerEmail', label: '邮箱', hideOnMobile: true },
    {
      key: 'totalAmount',
      label: '金额',
      render: (item: Order) => <span className="text-purple-400 font-medium">¥{item.totalAmount}</span>,
    },
    {
      key: 'status',
      label: '状态',
      render: (item: Order) => {
        const statusMap: Record<string, { bg: string; text: string; label: string }> = {
          Paid: { bg: 'bg-green-500/20', text: 'text-green-400', label: '已支付' },
          Pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '待支付' },
          Completed: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '已完成' },
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">收益分析</h1>
          <p className="text-gray-400 mt-1">课程销售收入统计</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg flex items-center gap-2 transition-colors"
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
          color="purple"
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
          label="已支付订单"
          value={paidOrders.length}
          color="default"
          icon="✅"
        />
        <KPICard
          label="待支付订单"
          value={pendingOrders.length}
          color="amber"
          icon="⏳"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="edu-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">收入概况</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">已确认收入</span>
              <span className="text-green-400 font-medium">
                ¥{paidOrders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">待确认收入</span>
              <span className="text-amber-400 font-medium">
                ¥{pendingOrders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
              </span>
            </div>
            <hr className="border-purple-500/20" />
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">总计</span>
              <span className="text-purple-400 font-bold text-lg">
                ¥{totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Order Stats */}
        <div className="edu-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">订单统计</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-400 flex-1">已支付</span>
              <span className="text-white">{paidOrders.length} 笔</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-gray-400 flex-1">待支付</span>
              <span className="text-white">{pendingOrders.length} 笔</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-gray-400 flex-1">总订单</span>
              <span className="text-white">{courseOrders.length} 笔</span>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="edu-card p-4">
        <h3 className="text-lg font-semibold text-white mb-4 px-2">订单明细</h3>
        <DataTable
          data={courseOrders}
          columns={columns}
          emptyMessage="暂无订单记录"
        />
      </div>
    </div>
  );
}
