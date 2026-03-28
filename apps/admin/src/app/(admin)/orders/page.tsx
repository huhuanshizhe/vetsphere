'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ToastContainer, useToast } from '@/components/ui';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: 'Pending' | 'Paid' | 'Shipped' | 'Completed' | 'Cancelled';
  payment_method?: string;
  payment_status?: string;
  shipping_address?: string;
  tracking_number?: string;
  created_at: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  Pending: { label: '待付款', className: 'bg-amber-100 text-amber-600' },
  Paid: { label: '已付款', className: 'bg-blue-100 text-blue-600' },
  Shipped: { label: '已发货', className: 'bg-purple-100 text-purple-600' },
  Completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-600' },
  Cancelled: { label: '已取消', className: 'bg-slate-100 text-slate-600' },
};

export default function AdminOrdersPage() {
  const supabase = createClient();
  const { toasts, removeToast, success, error: toastError } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toastError('加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'Shipped' && trackingNumber) {
        updates.tracking_number = trackingNumber;
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      setTrackingNumber('');
      setSelectedOrder(null);
      loadOrders();
      success(newStatus === 'Shipped' ? '订单已发货，快递单号已记录' : '订单状态已更新');
    } catch (error) {
      console.error('Failed to update order:', error);
      toastError('更新失败，请重试');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">订单管理</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { key: 'all', label: '全部', count: orders.length },
            { key: 'Pending', label: '待付款', count: orders.filter(o => o.status === 'Pending').length },
            { key: 'Paid', label: '待发货', count: orders.filter(o => o.status === 'Paid').length },
            { key: 'Shipped', label: '已发货', count: orders.filter(o => o.status === 'Shipped').length },
            { key: 'Completed', label: '已完成', count: orders.filter(o => o.status === 'Completed').length },
          ].map((stat) => (
            <button
              key={stat.key}
              onClick={() => setFilter(stat.key)}
              className={`p-4 rounded-xl border text-left ${filter === stat.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              <p className="text-2xl font-bold">{stat.count}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">订单号</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">客户</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">金额</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">状态</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleString('zh-CN')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{order.customer_name}</p>
                    <p className="text-xs text-slate-500">{order.customer_email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">¥{order.total_amount?.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{order.payment_method || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusConfig[order.status]?.className}`}>
                      {statusConfig[order.status]?.label}
                    </span>
                    {order.tracking_number && (
                      <p className="text-xs text-slate-500 mt-1">快递: {order.tracking_number}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        查看
                      </button>
                      {order.status === 'Paid' && (
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
                        >
                          发货
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">订单详情</h3>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">订单号</p>
                  <p className="font-medium">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">下单时间</p>
                  <p>{new Date(selectedOrder.created_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500">客户信息</p>
                <p className="font-medium">{selectedOrder.customer_name}</p>
                <p>{selectedOrder.customer_email}</p>
              </div>

              {selectedOrder.shipping_address && (
                <div>
                  <p className="text-sm text-slate-500">收货地址</p>
                  <p>{selectedOrder.shipping_address}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-slate-500 mb-2">订单商品</p>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.product_name} x{item.quantity}</span>
                      <span>¥{item.total_price?.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>总计</span>
                    <span>¥{selectedOrder.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.status === 'Paid' && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">填写快递单号</p>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="请输入快递单号"
                    className="w-full p-3 border border-slate-200 rounded-lg"
                    disabled={updating}
                  />
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Shipped')}
                    disabled={updating || !trackingNumber.trim()}
                    className="mt-2 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {updating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        处理中...
                      </>
                    ) : '确认发货'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast 通知容器 */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
