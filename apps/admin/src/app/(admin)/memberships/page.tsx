'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Button,
  Input,
  Select,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface Membership {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  start_date: string;
  end_date?: string;
  auto_renew: boolean;
  payment_method?: string;
  created_at: string;
  user?: { full_name: string; email: string; avatar_url?: string };
}

const PAGE_SIZE = 20;

export default function MembershipsPage() {
  const supabase = createClient();
  
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, expiring: 0, expired: 0 });
  const [filterPlan, setFilterPlan] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [membershipToAction, setMembershipToAction] = useState<Membership | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadMemberships();
  }, [filterPlan, filterStatus, searchKeyword, page]);

  async function loadMemberships() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('memberships')
        .select(`
          *,
          profiles:user_id (full_name, email, avatar_url)
        `, { count: 'exact' });
      
      if (filterPlan) {
        query = query.eq('plan_type', filterPlan);
      }
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      if (searchKeyword) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id')
          .or(`full_name.ilike.%${searchKeyword}%,email.ilike.%${searchKeyword}%`);
        if (users && users.length > 0) {
          query = query.in('user_id', users.map(u => u.id));
        }
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      const mappedData = (data || []).map((m: any) => ({
        ...m,
        user: m.profiles,
      }));
      
      setMemberships(mappedData);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载会员列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    
    const [totalRes, activeRes, expiringRes, expiredRes] = await Promise.all([
      supabase.from('memberships').select('*', { count: 'exact', head: true }),
      supabase.from('memberships').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('memberships').select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('end_date', sevenDaysLater.toISOString())
        .gte('end_date', now.toISOString()),
      supabase.from('memberships').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
    ]);
    
    setStats({
      total: totalRes.count || 0,
      active: activeRes.count || 0,
      expiring: expiringRes.count || 0,
      expired: expiredRes.count || 0,
    });
  }

  async function handleAction() {
    if (!membershipToAction || !actionType) return;
    
    setDialogLoading(true);
    try {
      let updateData: any = {};
      
      switch (actionType) {
        case 'cancel':
          updateData = { status: 'cancelled', auto_renew: false };
          break;
        case 'extend':
          const endDate = membershipToAction.end_date ? new Date(membershipToAction.end_date) : new Date();
          endDate.setMonth(endDate.getMonth() + 1);
          updateData = { end_date: endDate.toISOString(), status: 'active' };
          break;
        case 'toggle_renew':
          updateData = { auto_renew: !membershipToAction.auto_renew };
          break;
      }
      
      const { error } = await supabase
        .from('memberships')
        .update(updateData)
        .eq('id', membershipToAction.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'membership',
        action: actionType,
        target_type: 'membership',
        target_id: membershipToAction.id,
        target_name: membershipToAction.user?.full_name || membershipToAction.user_id,
        changes_summary: `${actionType === 'cancel' ? '取消' : actionType === 'extend' ? '延期' : '切换自动续费'}会员: ${membershipToAction.user?.full_name}`,
      });
      
      setShowActionDialog(false);
      setMembershipToAction(null);
      setActionType('');
      loadMemberships();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  function getDaysRemaining(endDate?: string) {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  const planLabels: Record<string, string> = {
    monthly: '月度会员',
    quarterly: '季度会员',
    yearly: '年度会员',
    lifetime: '终身会员',
  };

  const statusLabels: Record<string, string> = {
    active: '生效中',
    expired: '已过期',
    cancelled: '已取消',
    pending: '待生效',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">会员管理</h1>
        <p className="text-slate-400 mt-1">管理平台会员订阅与权益</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总会员数" value={stats.total} />
        <StatCard label="生效中" value={stats.active} />
        <StatCard label="即将到期" value={stats.expiring} />
        <StatCard label="已过期" value={stats.expired} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索会员姓名或邮箱..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <Select
            value={filterPlan}
            onChange={(e) => { setFilterPlan(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部套餐' },
              { value: 'monthly', label: '月度会员' },
              { value: 'quarterly', label: '季度会员' },
              { value: 'yearly', label: '年度会员' },
              { value: 'lifetime', label: '终身会员' },
            ]}
          />
          <Select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部状态' },
              { value: 'active', label: '生效中' },
              { value: 'expired', label: '已过期' },
              { value: 'cancelled', label: '已取消' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : memberships.length === 0 ? (
          <EmptyState title="暂无会员" description="当前筛选条件下没有找到会员记录" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">会员</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">套餐</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">有效期</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">剩余天数</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">自动续费</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {memberships.map((membership) => {
                    const daysRemaining = getDaysRemaining(membership.end_date);
                    return (
                      <tr key={membership.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                              {membership.user?.avatar_url ? (
                                <img src={membership.user.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg text-slate-400">{membership.user?.full_name?.[0] || '?'}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-white">{membership.user?.full_name || '未知'}</div>
                              <div className="text-slate-500 text-xs">{membership.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                            {planLabels[membership.plan_type] || membership.plan_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          <div>{new Date(membership.start_date).toLocaleDateString('zh-CN')}</div>
                          {membership.end_date && (
                            <div className="text-xs">至 {new Date(membership.end_date).toLocaleDateString('zh-CN')}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {daysRemaining !== null ? (
                            <span className={`text-sm font-medium ${
                              daysRemaining <= 0 ? 'text-red-400' :
                              daysRemaining <= 7 ? 'text-amber-400' :
                              'text-slate-300'
                            }`}>
                              {daysRemaining <= 0 ? '已过期' : `${daysRemaining} 天`}
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-sm">永久</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            membership.auto_renew
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {membership.auto_renew ? '是' : '否'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            membership.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : membership.status === 'expired'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {statusLabels[membership.status] || membership.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {membership.status === 'active' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => { setMembershipToAction(membership); setActionType('extend'); setShowActionDialog(true); }}>
                                  延期
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setMembershipToAction(membership); setActionType('toggle_renew'); setShowActionDialog(true); }}>
                                  {membership.auto_renew ? '关闭续费' : '开启续费'}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      <ConfirmDialog
        open={showActionDialog}
        title={
          actionType === 'extend' ? '延长会员期限' :
          actionType === 'cancel' ? '取消会员' :
          actionType === 'toggle_renew' ? (membershipToAction?.auto_renew ? '关闭自动续费' : '开启自动续费') :
          '操作确认'
        }
        message={
          actionType === 'extend' ? `确定要为会员 "${membershipToAction?.user?.full_name}" 延长1个月的有效期吗？` :
          actionType === 'cancel' ? `确定要取消会员 "${membershipToAction?.user?.full_name}" 的会员资格吗？` :
          actionType === 'toggle_renew' ? `确定要${membershipToAction?.auto_renew ? '关闭' : '开启'}会员 "${membershipToAction?.user?.full_name}" 的自动续费吗？` :
          '确认执行此操作？'
        }
        confirmText="确认"
        onConfirm={handleAction}
        onCancel={() => { setShowActionDialog(false); setMembershipToAction(null); setActionType(''); }}
        loading={dialogLoading}
        danger={actionType === 'cancel'}
      />
    </div>
  );
}
