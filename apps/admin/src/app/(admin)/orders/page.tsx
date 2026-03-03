'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Button,
  Input,
  Select,
  StatusBadge,
  LoadingState,
  EmptyState,
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface Order {
  id: string;
  order_no: string;
  user_id: string;
  user?: { full_name: string; email: string };
  order_type: string;
  status: string;
  total_amount: number;
  paid_amount?: number;
  payment_method?: string;
  paid_at?: string;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const supabase = createClient();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, refunded: 0, revenue: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadOrders();
  }, [filterStatus, filterType, searchKeyword, page]);

  async function loadOrders() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('orders')
        .select(`
          id, order_no, user_id, order_type, status, total_amount, paid_amount,
          payment_method, paid_at, created_at,
          profiles:user_id (full_name, email)
        `, { count: 'exact' });
      
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      if (filterType) {
        query = query.eq('order_type', filterType);
      }
      if (searchKeyword) {
        query = query.or(`order_no.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      const mappedOrders = (data || []).map((o: any) => ({
        ...o,
        user: o.profiles,
      }));
      
      setOrders(mappedOrders);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载订单列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const [totalRes, pendingRes, paidRes, refundedRes, revenueRes] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'refunded'),
      supabase.from('orders').select('paid_amount').eq('status', 'paid'),
    ]);
    
    const revenue = (revenueRes.data || []).reduce((sum, o) => sum + (o.paid_amount || 0), 0);
    
    setStats({
      total: totalRes.count || 0,
      pending: pendingRes.count || 0,
      paid: paidRes.count || 0,
      refunded: refundedRes.count || 0,
      revenue,
    });
  }

  const typeLabels: Record<string, string> = {
    course: '课程',
    product: '商品',
    membership: '会员',
  };

  const statusLabels: Record<string, string> = {
    pending: '待支付',
    paid: '已支付',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">订单管理</h1>
        <p className="text-slate-400 mt-1">查看和管理平台订单</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="总订单数" value={stats.total} />
        <StatCard label="待支付" value={stats.pending} />
        <StatCard label="已支付" value={stats.paid} />
        <StatCard label="已退款" value={stats.refunded} />
        <StatCard label="总收入" value={`¥${stats.revenue.toLocaleString()}`} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索订单号..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部状态' },
              { value: 'pending', label: '待支付' },
              { value: 'paid', label: '已支付' },
              { value: 'completed', label: '已完成' },
              { value: 'cancelled', label: '已取消' },
              { value: 'refunded', label: '已退款' },
            ]}
          />
          <Select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部类型' },
              { value: 'course', label: '课程' },
              { value: 'product', label: '商品' },
              { value: 'membership', label: '会员' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : orders.length === 0 ? (
          <EmptyState title="暂无订单" description="当前筛选条件下没有找到订单" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">订单号</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">用户</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">类型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">金额</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">创建时间</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <code className="text-sm text-emerald-400">{order.order_no || order.id.slice(0, 8)}</code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-white">{order.user?.full_name || '未知'}</div>
                          <div className="text-slate-500 text-xs">{order.user?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        {typeLabels[order.order_type] || order.order_type}
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        ¥{order.total_amount?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {new Date(order.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => window.location.href = `/orders/${order.id}`}>
                          详情
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-700/50">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
