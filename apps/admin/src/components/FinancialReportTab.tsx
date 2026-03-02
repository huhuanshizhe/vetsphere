'use client';

import React from 'react';
import { Order } from '@vetsphere/shared/types';
import KPICard from './KPICard';
import DataTable, { Column } from './DataTable';

interface FinancialReportTabProps {
  orders: Order[];
}

const FinancialReportTab: React.FC<FinancialReportTabProps> = ({ orders }) => {
  const totalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const courseRevenue = orders.reduce(
    (sum, o) => sum + o.items.filter(i => i.type === 'course').reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );
  const productRevenue = orders.reduce(
    (sum, o) => sum + o.items.filter(i => i.type !== 'course').reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );

  const handleExportCSV = () => {
    const csv = ['订单号,客户,类型,金额,日期,状态'].concat(
      orders.map(o => `${o.id},${o.customerEmail || o.customerName},${o.items.map(i => i.type).join('+')},${o.totalAmount},${o.date},${o.status}`)
    ).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vetsphere_finance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<Order>[] = [
    { key: 'id', header: '订单号', render: (v) => <span className="font-mono font-bold text-white">#{String(v).slice(0, 8)}</span> },
    { key: 'customerEmail', header: '客户', render: (v, row) => <span className="text-slate-400">{v || row.customerName || '-'}</span>, hideOnMobile: true },
    {
      key: 'items',
      header: '类型',
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.items.some(i => i.type === 'course') && <span className="bg-purple-900/30 text-purple-400 text-xs font-bold px-2 py-0.5 rounded">课程</span>}
          {row.items.some(i => i.type !== 'course') && <span className="bg-blue-900/30 text-blue-400 text-xs font-bold px-2 py-0.5 rounded">商品</span>}
        </div>
      ),
      hideOnMobile: true,
    },
    { key: 'totalAmount', header: '金额', render: (v) => <span className="font-bold text-white">¥{(v || 0).toLocaleString()}</span> },
    { key: 'date', header: '日期', render: (v) => <span className="text-slate-500">{v}</span>, hideOnMobile: true },
    {
      key: 'status',
      header: '状态',
      render: (v) => {
        const colors: Record<string, string> = {
          Paid: 'bg-emerald-900/30 text-emerald-400',
          Pending: 'bg-amber-900/30 text-amber-400',
          Shipped: 'bg-blue-900/30 text-blue-400',
        };
        return <span className={`text-xs font-bold px-2 py-1 rounded ${colors[v] || 'bg-slate-800 text-slate-400'}`}>{v}</span>;
      },
    },
  ];

  const mobileCard = (order: Order) => (
    <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-mono font-bold text-white">#{order.id.slice(0, 8)}</p>
          <p className="text-xs text-slate-500">{order.customerEmail || order.customerName}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded ${
          order.status === 'Paid' ? 'bg-emerald-900/30 text-emerald-400' :
          order.status === 'Pending' ? 'bg-amber-900/30 text-amber-400' :
          'bg-slate-800 text-slate-400'
        }`}>{order.status}</span>
      </div>
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
        <div className="flex flex-wrap gap-1">
          {order.items.some(i => i.type === 'course') && <span className="bg-purple-900/30 text-purple-400 text-xs font-bold px-2 py-0.5 rounded">课程</span>}
          {order.items.some(i => i.type !== 'course') && <span className="bg-blue-900/30 text-blue-400 text-xs font-bold px-2 py-0.5 rounded">商品</span>}
        </div>
        <span className="font-bold text-white">¥{order.totalAmount.toLocaleString()}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <h3 className="font-bold text-lg text-white">财务报表</h3>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="总收入" value={`¥${totalRevenue.toLocaleString()}`} color="emerald" />
        <KPICard label="课程收入" value={`¥${courseRevenue.toLocaleString()}`} color="purple" />
        <KPICard label="商品收入" value={`¥${productRevenue.toLocaleString()}`} />
        <KPICard label="总订单数" value={orders.length} color="emerald" />
      </div>

      {/* Orders table */}
      <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 sm:p-5 border-b border-white/5">
          <h4 className="font-bold text-white">订单明细</h4>
          <button onClick={handleExportCSV} className="bg-emerald-500 text-black px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-400 transition min-h-[44px]">
            导出 CSV
          </button>
        </div>
        <DataTable columns={columns} data={orders} keyField="id" mobileCardRenderer={mobileCard} emptyMessage="暂无订单数据" />
      </div>
    </div>
  );
};

export default FinancialReportTab;
