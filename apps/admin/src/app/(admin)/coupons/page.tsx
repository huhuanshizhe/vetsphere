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

interface Coupon {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  min_amount?: number;
  max_discount?: number;
  usage_limit?: number;
  used_count: number;
  per_user_limit?: number;
  start_at?: string;
  end_at?: string;
  is_active: boolean;
  applicable_products?: string[];
  created_at: string;
}

const PAGE_SIZE = 20;

export default function CouponsPage() {
  const supabase = createClient();
  
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, totalUsed: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<Partial<Coupon> | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [couponToAction, setCouponToAction] = useState<Coupon | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadCoupons();
  }, [filterStatus, filterType, searchKeyword, page]);

  async function loadCoupons() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('coupons')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);
      
      if (filterStatus === 'active') {
        query = query.eq('is_active', true);
      } else if (filterStatus === 'inactive') {
        query = query.eq('is_active', false);
      }
      
      if (filterType) {
        query = query.eq('type', filterType);
      }
      
      if (searchKeyword) {
        query = query.or(`code.ilike.%${searchKeyword}%,name.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setCoupons(data || []);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载优惠券失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const now = new Date().toISOString();
    
    const [totalRes, activeRes, expiredRes, usedRes] = await Promise.all([
      supabase.from('coupons').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('coupons').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_active', true),
      supabase.from('coupons').select('*', { count: 'exact', head: true }).is('deleted_at', null).lt('end_at', now),
      supabase.from('coupons').select('used_count').is('deleted_at', null),
    ]);
    
    const totalUsed = usedRes.data?.reduce((sum, c) => sum + (c.used_count || 0), 0) || 0;
    
    setStats({
      total: totalRes.count || 0,
      active: activeRes.count || 0,
      expired: expiredRes.count || 0,
      totalUsed,
    });
  }

  async function handleToggleCoupon() {
    if (!couponToAction) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !couponToAction.is_active })
        .eq('id', couponToAction.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'marketing',
        action: couponToAction.is_active ? 'disable' : 'enable',
        target_type: 'coupon',
        target_id: couponToAction.id,
        target_name: couponToAction.name,
        changes_summary: `${couponToAction.is_active ? '禁用' : '启用'}优惠券: ${couponToAction.name}`,
      });
      
      setShowActionDialog(false);
      setCouponToAction(null);
      loadCoupons();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleSaveCoupon() {
    if (!couponToEdit) return;
    
    setDialogLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (couponToEdit.id) {
        const { error } = await supabase
          .from('coupons')
          .update({
            name: couponToEdit.name,
            type: couponToEdit.type,
            value: couponToEdit.value,
            min_amount: couponToEdit.min_amount,
            max_discount: couponToEdit.max_discount,
            usage_limit: couponToEdit.usage_limit,
            per_user_limit: couponToEdit.per_user_limit,
            start_at: couponToEdit.start_at,
            end_at: couponToEdit.end_at,
          })
          .eq('id', couponToEdit.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert({
            code: couponToEdit.code,
            name: couponToEdit.name,
            type: couponToEdit.type || 'fixed',
            value: couponToEdit.value || 0,
            min_amount: couponToEdit.min_amount,
            max_discount: couponToEdit.max_discount,
            usage_limit: couponToEdit.usage_limit,
            per_user_limit: couponToEdit.per_user_limit,
            start_at: couponToEdit.start_at,
            end_at: couponToEdit.end_at,
            is_active: true,
            used_count: 0,
          });
        
        if (error) throw error;
      }
      
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'marketing',
        action: couponToEdit.id ? 'update' : 'create',
        target_type: 'coupon',
        target_id: couponToEdit.id || couponToEdit.code,
        target_name: couponToEdit.name,
        changes_summary: `${couponToEdit.id ? '更新' : '创建'}优惠券: ${couponToEdit.name}`,
      });
      
      setShowEditDialog(false);
      setCouponToEdit(null);
      loadCoupons();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请检查优惠码是否重复');
    } finally {
      setDialogLoading(false);
    }
  }

  function formatValue(coupon: Coupon) {
    if (coupon.type === 'percentage') {
      return `${coupon.value}% OFF`;
    }
    return `¥${coupon.value}`;
  }

  function getCouponStatus(coupon: Coupon) {
    const now = new Date();
    if (!coupon.is_active) {
      return { label: '已禁用', color: 'bg-slate-500/20 text-slate-400' };
    }
    if (coupon.end_at && new Date(coupon.end_at) < now) {
      return { label: '已过期', color: 'bg-red-500/20 text-red-400' };
    }
    if (coupon.start_at && new Date(coupon.start_at) > now) {
      return { label: '未开始', color: 'bg-amber-500/20 text-amber-400' };
    }
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return { label: '已用完', color: 'bg-red-500/20 text-red-400' };
    }
    return { label: '生效中', color: 'bg-emerald-500/20 text-emerald-400' };
  }

  const typeLabels: Record<string, string> = {
    fixed: '固定金额',
    percentage: '百分比折扣',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">优惠券管理</h1>
          <p className="text-slate-400 mt-1">创建和管理平台优惠券</p>
        </div>
        <Button onClick={() => {
          setCouponToEdit({
            code: '',
            name: '',
            type: 'fixed',
            value: 0,
          });
          setShowEditDialog(true);
        }}>
          新建优惠券
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="优惠券总数" value={stats.total} />
        <StatCard label="生效中" value={stats.active} />
        <StatCard label="已过期" value={stats.expired} />
        <StatCard label="总使用次数" value={stats.totalUsed} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索优惠码或名称..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <Select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部类型' },
              { value: 'fixed', label: '固定金额' },
              { value: 'percentage', label: '百分比折扣' },
            ]}
          />
          <Select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部状态' },
              { value: 'active', label: '启用中' },
              { value: 'inactive', label: '已禁用' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : coupons.length === 0 ? (
          <EmptyState title="暂无优惠券" description="当前筛选条件下没有找到优惠券" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">优惠券</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">优惠码</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">优惠</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">使用情况</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">有效期</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {coupons.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    return (
                      <tr key={coupon.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-white">{coupon.name}</div>
                            <div className="text-slate-500 text-xs mt-1">
                              {coupon.min_amount ? `满¥${coupon.min_amount}可用` : '无门槛'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-sm text-blue-400 bg-slate-700/50 px-2 py-1 rounded">
                            {coupon.code}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-bold text-emerald-400">{formatValue(coupon)}</span>
                          {coupon.max_discount && coupon.type === 'percentage' && (
                            <div className="text-slate-500 text-xs">最高减¥{coupon.max_discount}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {coupon.used_count} / {coupon.usage_limit || '∞'}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {coupon.start_at || coupon.end_at ? (
                            <div className="text-xs">
                              {coupon.start_at && <div>{new Date(coupon.start_at).toLocaleDateString('zh-CN')}</div>}
                              {coupon.end_at && <div>至 {new Date(coupon.end_at).toLocaleDateString('zh-CN')}</div>}
                            </div>
                          ) : (
                            <span>永久</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant={coupon.is_active ? 'ghost' : 'primary'}
                              size="sm"
                              onClick={() => { setCouponToAction(coupon); setShowActionDialog(true); }}
                            >
                              {coupon.is_active ? '禁用' : '启用'}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => { setCouponToEdit(coupon); setShowEditDialog(true); }}>
                              编辑
                            </Button>
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
        title={couponToAction?.is_active ? '禁用优惠券' : '启用优惠券'}
        message={`确定要${couponToAction?.is_active ? '禁用' : '启用'}优惠券 "${couponToAction?.name}" 吗？`}
        confirmText="确认"
        onConfirm={handleToggleCoupon}
        onCancel={() => { setShowActionDialog(false); setCouponToAction(null); }}
        loading={dialogLoading}
        danger={couponToAction?.is_active}
      />

      {showEditDialog && couponToEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                {couponToEdit.id ? '编辑优惠券' : '新建优惠券'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {!couponToEdit.id && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">优惠码</label>
                  <Input
                    value={couponToEdit.code || ''}
                    onChange={(e) => setCouponToEdit({ ...couponToEdit, code: e.target.value.toUpperCase() })}
                    placeholder="例如: NEWYEAR2026"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">名称</label>
                <Input
                  value={couponToEdit.name || ''}
                  onChange={(e) => setCouponToEdit({ ...couponToEdit, name: e.target.value })}
                  placeholder="优惠券名称"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">类型</label>
                  <Select
                    value={couponToEdit.type || 'fixed'}
                    onChange={(e) => setCouponToEdit({ ...couponToEdit, type: e.target.value })}
                    options={[
                      { value: 'fixed', label: '固定金额' },
                      { value: 'percentage', label: '百分比折扣' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {couponToEdit.type === 'percentage' ? '折扣百分比 (%)' : '优惠金额 (¥)'}
                  </label>
                  <Input
                    type="number"
                    value={couponToEdit.value || ''}
                    onChange={(e) => setCouponToEdit({ ...couponToEdit, value: parseFloat(e.target.value) })}
                    placeholder={couponToEdit.type === 'percentage' ? '1-100' : '金额'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">最低消费 (¥)</label>
                  <Input
                    type="number"
                    value={couponToEdit.min_amount || ''}
                    onChange={(e) => setCouponToEdit({ ...couponToEdit, min_amount: parseFloat(e.target.value) || undefined })}
                    placeholder="无门槛留空"
                  />
                </div>
                {couponToEdit.type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">最高减免 (¥)</label>
                    <Input
                      type="number"
                      value={couponToEdit.max_discount || ''}
                      onChange={(e) => setCouponToEdit({ ...couponToEdit, max_discount: parseFloat(e.target.value) || undefined })}
                      placeholder="不限制留空"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">总使用次数</label>
                  <Input
                    type="number"
                    value={couponToEdit.usage_limit || ''}
                    onChange={(e) => setCouponToEdit({ ...couponToEdit, usage_limit: parseInt(e.target.value) || undefined })}
                    placeholder="不限制留空"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">每人限用</label>
                  <Input
                    type="number"
                    value={couponToEdit.per_user_limit || ''}
                    onChange={(e) => setCouponToEdit({ ...couponToEdit, per_user_limit: parseInt(e.target.value) || undefined })}
                    placeholder="不限制留空"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">开始时间</label>
                  <Input
                    type="datetime-local"
                    value={couponToEdit.start_at?.slice(0, 16) || ''}
                    onChange={(e) => setCouponToEdit({ ...couponToEdit, start_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">结束时间</label>
                  <Input
                    type="datetime-local"
                    value={couponToEdit.end_at?.slice(0, 16) || ''}
                    onChange={(e) => setCouponToEdit({ ...couponToEdit, end_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowEditDialog(false); setCouponToEdit(null); }}>
                取消
              </Button>
              <Button onClick={handleSaveCoupon} disabled={dialogLoading}>
                {dialogLoading ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
