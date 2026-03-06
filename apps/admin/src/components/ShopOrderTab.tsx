'use client';

import React, { useState, useMemo } from 'react';
import { api } from '@vetsphere/shared/services/api';
import KPICard from './KPICard';
import DataTable, { Column } from './DataTable';

interface ShopOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: string;
  imageUrl?: string;
}

interface ShopOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  items: ShopOrderItem[];
  allItems: ShopOrderItem[];
  productTotal: number;
  totalAmount: number;
  status: string;
  shippingAddress?: any;
  paymentMethod?: string;
  date: string;
  createdAt: string;
}

interface ShopOrderTabProps {
  orders: ShopOrder[];
  onRefresh: () => void;
}

const STATUS_MAP: Record<string, string> = {
  Pending: '待支付',
  Paid: '已支付',
  Shipped: '已发货',
  Completed: '已完成',
  Refunded: '已退款',
};

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-500/10 text-amber-400',
  Paid: 'bg-emerald-500/10 text-emerald-400',
  Shipped: 'bg-blue-500/10 text-blue-400',
  Completed: 'bg-purple-500/10 text-purple-400',
  Refunded: 'bg-red-500/10 text-red-400',
};

const ShopOrderTab: React.FC<ShopOrderTabProps> = ({ orders, onRefresh }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (filter !== 'all') {
      result = result.filter(o => o.status === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.customerName?.toLowerCase().includes(q) ||
        o.customerEmail?.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.items.some(i => i.name?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [orders, filter, search]);

  const kpis = useMemo(() => {
    const paidOrders = orders.filter(o => o.status !== 'Pending' && o.status !== 'Refunded');
    const revenue = paidOrders.reduce((sum, o) => sum + o.productTotal, 0);
    const pendingShip = orders.filter(o => o.status === 'Paid').length;
    const shipped = orders.filter(o => o.status === 'Shipped').length;

    return {
      total: orders.length,
      revenue,
      pendingShip,
      shipped,
    };
  }, [orders]);

  const handleShipOrder = async (orderId: string) => {
    setActionLoading(true);
    try {
      await api.updateOrderStatus(orderId, 'Shipped');
      onRefresh();
      setSelectedOrder(null);
    } catch {
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    setActionLoading(true);
    try {
      await api.updateOrderStatus(orderId, 'Completed');
      onRefresh();
      setSelectedOrder(null);
    } catch {
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    setActionLoading(true);
    try {
      await api.updateOrderStatus(orderId, 'Paid');
      onRefresh();
      setSelectedOrder(null);
    } catch {
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['订单号', '客户姓名', '客户邮箱', '商品', '商品金额', '订单总额', '状态', '日期'];
    const rows = filteredOrders.map(o => [
      o.id,
      o.customerName,
      o.customerEmail,
      o.items.map(i => `${i.name}x${i.quantity}`).join('; '),
      o.productTotal.toString(),
      o.totalAmount.toString(),
      STATUS_MAP[o.status] || o.status,
      new Date(o.date).toLocaleDateString('zh-CN'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `商城订单_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getProductSummary = (order: ShopOrder) => {
    if (order.items.length === 0) return '-';
    if (order.items.length === 1) return order.items[0].name;
    return `${order.items[0].name} +${order.items.length - 1}`;
  };

  const formatAddress = (addr: any) => {
    if (!addr) return '-';
    if (typeof addr === 'string') return addr;
    const parts = [addr.name, addr.street, addr.city, addr.state, addr.country, addr.zip].filter(Boolean);
    return parts.join(', ') || '-';
  };

  const columns: Column<ShopOrder>[] = [
    {
      key: 'id',
      header: '订单号',
      render: (v: string) => (
        <span className="font-mono text-slate-900 text-xs">#{v.slice(0, 12)}</span>
      ),
    },
    {
      key: 'customerName',
      header: '客户',
      render: (_: any, row: ShopOrder) => (
        <div>
          <p className="text-slate-900 font-medium text-sm">{row.customerName || '-'}</p>
          <p className="text-slate-500 text-xs truncate max-w-[160px]">{row.customerEmail}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: '商品',
      render: (_: any, row: ShopOrder) => (
        <span className="text-slate-600 text-sm truncate max-w-[200px] block">{getProductSummary(row)}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'productTotal',
      header: '商品金额',
      align: 'right',
      render: (v: number) => (
        <span className="text-emerald-400 font-bold">¥{(v || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (v: string) => (
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[v] || 'bg-slate-500/10 text-slate-500'}`}>
          {STATUS_MAP[v] || v}
        </span>
      ),
    },
    {
      key: 'date',
      header: '日期',
      align: 'right',
      render: (v: string) => (
        <span className="text-slate-500 text-xs">{v?.split('T')[0]}</span>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">商城订单管理</h2>
          <p className="text-sm text-slate-500 mt-1">管理所有商品购买订单、发货与物流</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold text-slate-500 hover:bg-white/10 hover:text-slate-900 transition-all min-h-[40px]"
          >
            导出CSV
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-sm font-bold text-emerald-400 hover:bg-emerald-500/30 transition-all min-h-[40px]"
          >
            刷新
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="商品订单总数" value={kpis.total} color="default" />
        <KPICard label="商品销售额" value={`¥${kpis.revenue.toLocaleString()}`} color="emerald" />
        <KPICard label="待发货" value={kpis.pendingShip} color="amber" subtitle="已支付待发货" />
        <KPICard label="已发货" value={kpis.shipped} color="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: '全部' },
            { key: 'Pending', label: '待支付' },
            { key: 'Paid', label: '已支付' },
            { key: 'Shipped', label: '已发货' },
            { key: 'Completed', label: '已完成' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[32px] ${
                filter === f.key
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索客户/订单号/商品..."
            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-white/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredOrders}
          keyField="id"
          emptyMessage="暂无商品订单"
          onRowClick={(order) => setSelectedOrder(order)}
          mobileCardRenderer={(order: ShopOrder) => (
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-slate-900 font-bold text-sm">{order.customerName || order.customerEmail}</p>
                  <p className="text-slate-500 text-xs font-mono">#{order.id.slice(0, 12)}</p>
                </div>
                <span className="text-emerald-400 font-black">
                  ¥{(order.productTotal || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-500 text-xs mb-2 truncate">{getProductSummary(order)}</p>
              <div className="flex justify-between items-center">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[order.status] || 'bg-slate-500/10 text-slate-500'}`}>
                  {STATUS_MAP[order.status] || order.status}
                </span>
                <span className="text-slate-600 text-xs">{order.date?.split('T')[0]}</span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-200/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900">商品订单详情</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">#{selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-slate-900"
              >
                x
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">客户</p>
                  <p className="text-slate-900 font-bold">{selectedOrder.customerName || '-'}</p>
                  <p className="text-slate-500 text-xs">{selectedOrder.customerEmail}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">订单金额</p>
                  <p className="text-emerald-400 font-black text-xl">
                    ¥{(selectedOrder.totalAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {selectedOrder.paymentMethod || '-'} | {STATUS_MAP[selectedOrder.status] || selectedOrder.status}
                  </p>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">收货地址</p>
                <p className="text-slate-900 text-sm">{formatAddress(selectedOrder.shippingAddress)}</p>
                {selectedOrder.shippingAddress?.phone && (
                  <p className="text-slate-500 text-xs mt-1">电话: {selectedOrder.shippingAddress.phone}</p>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3">商品明细</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-xl p-3">
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex-shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg text-slate-600">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 text-sm font-medium truncate">{item.name}</p>
                        <p className="text-slate-500 text-xs">x{item.quantity}</p>
                      </div>
                      <p className="text-emerald-400 font-bold text-sm flex-shrink-0">
                        ¥{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-white/5 pt-4 flex flex-wrap gap-2">
                {selectedOrder.status === 'Pending' && (
                  <button
                    onClick={() => handleConfirmPayment(selectedOrder.id)}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-sm hover:bg-amber-500/30 transition disabled:opacity-50"
                  >
                    {actionLoading ? '处理中...' : '手动确认支付'}
                  </button>
                )}
                {selectedOrder.status === 'Paid' && (
                  <button
                    onClick={() => handleShipOrder(selectedOrder.id)}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-400 transition disabled:opacity-50"
                  >
                    {actionLoading ? '处理中...' : '确认发货'}
                  </button>
                )}
                {selectedOrder.status === 'Shipped' && (
                  <button
                    onClick={() => handleCompleteOrder(selectedOrder.id)}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-emerald-500 text-black rounded-xl font-bold text-sm hover:bg-emerald-400 transition disabled:opacity-50"
                  >
                    {actionLoading ? '处理中...' : '确认收货完成'}
                  </button>
                )}
              </div>

              {/* Meta */}
              <div className="text-xs text-slate-600 border-t border-white/5 pt-3">
                下单时间: {selectedOrder.date?.split('T')[0]} |
                支付方式: {selectedOrder.paymentMethod || '-'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopOrderTab;
