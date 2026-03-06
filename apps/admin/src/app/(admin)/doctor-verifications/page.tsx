'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useSite } from '@/context/SiteContext';
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  StatusBadge, 
  LoadingState, 
  EmptyState,
  Pagination,
  StatCard,
  ConfirmDialog,
} from '@/components/ui';
import type { DoctorApplication } from '@/types/admin';

type FilterStatus = 'all' | 'pending_review' | 'approved' | 'rejected';

export default function DoctorVerificationsPage() {
  const supabase = createClient();
  const { currentSite } = useSite();
  
  // 获取 access token
  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };
  
  // 状态
  const [applications, setApplications] = useState<DoctorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    todayNew: 0,
  });
  
  // 筛选
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // 操作状态
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    application: DoctorApplication | null;
  }>({ open: false, type: 'approve', application: null });
  const [rejectReason, setRejectReason] = useState('');

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 构建查询
      let query = supabase
        .from('doctor_applications')
        .select('*', { count: 'exact' })
        .eq('site_code', currentSite);

      // 状态筛选
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      // 关键词搜索
      if (searchKeyword) {
        query = query.or(`full_name.ilike.%${searchKeyword}%,phone.ilike.%${searchKeyword}%,hospital_name.ilike.%${searchKeyword}%`);
      }

      // 分页和排序
      query = query
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      setApplications(data || []);
      setTotal(count || 0);

      // 加载统计
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        supabase.from('doctor_applications').select('id', { count: 'exact', head: true }).eq('site_code', currentSite).eq('status', 'pending_review'),
        supabase.from('doctor_applications').select('id', { count: 'exact', head: true }).eq('site_code', currentSite).eq('status', 'approved'),
        supabase.from('doctor_applications').select('id', { count: 'exact', head: true }).eq('site_code', currentSite).eq('status', 'rejected'),
      ]);

      setStats({
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        rejected: rejectedRes.count || 0,
        todayNew: 0, // TODO: 计算今日新增
      });

    } catch (error) {
      console.error('Failed to load doctor applications:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, filterStatus, searchKeyword, page, currentSite]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 审核通过
  const handleApprove = async () => {
    if (!confirmDialog.application) return;
    
    setActionLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        alert('登录已过期，请重新登录');
        return;
      }

      const res = await fetch(`/api/admin/doctor-applications/${confirmDialog.application.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '审核失败');
      }

      setConfirmDialog({ open: false, type: 'approve', application: null });
      loadData();
    } catch (error: any) {
      console.error('Failed to approve:', error);
      alert(error.message || '审核失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // 审核拒绝
  const handleReject = async () => {
    if (!confirmDialog.application || !rejectReason.trim()) return;
    
    setActionLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        alert('登录已过期，请重新登录');
        return;
      }

      const res = await fetch(`/api/admin/doctor-applications/${confirmDialog.application.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reject', reason: rejectReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '审核失败');
      }

      setConfirmDialog({ open: false, type: 'reject', application: null });
      setRejectReason('');
      loadData();
    } catch (error: any) {
      console.error('Failed to reject:', error);
      alert(error.message || '审核失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  const openApproveDialog = (app: DoctorApplication) => {
    setConfirmDialog({ open: true, type: 'approve', application: app });
  };

  const openRejectDialog = (app: DoctorApplication) => {
    setConfirmDialog({ open: true, type: 'reject', application: app });
    setRejectReason('');
  };

  return (
    <>
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="待审核"
          value={stats.pending}
          icon="⏳"
        />
        <StatCard
          label="已通过"
          value={stats.approved}
          icon="✅"
        />
        <StatCard
          label="已拒绝"
          value={stats.rejected}
          icon="❌"
        />
        <StatCard
          label="今日新增"
          value={stats.todayNew}
          icon="📥"
        />
      </div>

      {/* 筛选区 */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索姓名、手机号、机构名称..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(1);
              }}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as FilterStatus);
                setPage(1);
              }}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'pending_review', label: '待审核' },
                { value: 'approved', label: '已通过' },
                { value: 'rejected', label: '已拒绝' },
              ]}
            />
          </div>
          <Button variant="secondary" onClick={loadData}>
            刷新
          </Button>
        </div>
      </Card>

      {/* 列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState text="加载审核列表..." />
        ) : applications.length === 0 ? (
          <EmptyState
            icon="📋"
            title="暂无审核申请"
            description={filterStatus !== 'all' ? '当前筛选条件下没有数据' : '还没有医生提交申请'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      申请人
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      联系方式
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      机构/职位
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      专科方向
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      提交时间
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      状态
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {app.avatar_url ? (
                            <img
                              src={app.avatar_url}
                              alt={app.full_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
                              {app.full_name?.[0] || '?'}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-900">{app.full_name || '-'}</p>
                            <p className="text-xs text-slate-500">{app.city || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-600">{app.phone || '-'}</p>
                        <p className="text-xs text-slate-500">{app.email || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-600">{app.hospital_name || '-'}</p>
                        <p className="text-xs text-slate-500">{app.position || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(app.specialties || []).slice(0, 2).map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-white/5 text-slate-500 rounded">
                              {s}
                            </span>
                          ))}
                          {(app.specialties || []).length > 2 && (
                            <span className="text-[10px] text-slate-500">+{app.specialties!.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-500">
                          {app.submitted_at
                            ? new Date(app.submitted_at).toLocaleDateString('zh-CN')
                            : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/doctor-verifications/${app.id}`}
                            className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                          >
                            详情
                          </Link>
                          {app.status === 'pending_review' && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => openApproveDialog(app)}
                              >
                                通过
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => openRejectDialog(app)}
                              >
                                拒绝
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* 分页 */}
            <div className="px-4 pb-4">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* 审核通过确认框 */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'approve'}
        onClose={() => setConfirmDialog({ open: false, type: 'approve', application: null })}
        onConfirm={handleApprove}
        title="确认审核通过"
        description={`确定要通过 ${confirmDialog.application?.full_name || ''} 的医生认证申请吗？通过后该用户将获得医生身份权限。`}
        confirmText="确认通过"
        variant="info"
        loading={actionLoading}
      />

      {/* 审核拒绝对话框 */}
      {confirmDialog.open && confirmDialog.type === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDialog({ open: false, type: 'reject', application: null })} />
          <div className="relative bg-slate-950 border border-slate-200/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">审核拒绝</h3>
                <p className="text-sm text-slate-500">
                  请选择或填写拒绝 {confirmDialog.application?.full_name || ''} 的原因
                </p>
              </div>
            </div>
            
            {/* 预设原因 */}
            <div className="space-y-2 mb-4">
              {[
                '资质材料不清晰',
                '身份信息不完整',
                '无法确认执业相关信息',
                '请补充机构证明',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                    ${rejectReason === reason
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-white/5 text-slate-500 hover:bg-white/10'
                    }
                  `}
                >
                  {reason}
                </button>
              ))}
            </div>
            
            {/* 自定义原因 */}
            <textarea
              placeholder="或输入其他拒绝原因..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 resize-none h-20"
            />
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={() => setConfirmDialog({ open: false, type: 'reject', application: null })}
                disabled={actionLoading}
              >
                取消
              </Button>
              <Button 
                variant="danger" 
                onClick={handleReject} 
                loading={actionLoading}
                disabled={!rejectReason.trim()}
              >
                确认拒绝
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
