'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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

type FilterStatus = 'all' | 'submitted' | 'under_review' | 'approved' | 'rejected';

interface VerificationItem {
  id: string;
  userId: string;
  status: string;
  verificationType: string;
  realName: string;
  organizationName: string;
  positionTitle: string;
  specialtyTags: string[];
  submittedAt: string | null;
  reviewedAt: string | null;
  approvedLevel: string | null;
  user: {
    mobile: string;
    displayName: string | null;
  };
}

export default function CnVerificationsPage() {
  // State
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    submitted: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
  });
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    verification: VerificationItem | null;
  }>({ open: false, type: 'approve', verification: null });
  const [rejectReason, setRejectReason] = useState('');

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.set('status', filterStatus);
      }
      if (filterType) {
        params.set('type', filterType);
      }
      if (searchMobile) {
        params.set('mobile', searchMobile);
      }
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/v1/admin/cn-verifications?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load verifications');
      }

      const data = await res.json();
      setVerifications(data.items || []);
      setTotal(data.total || 0);

      // Load stats (simple counts from current data - in production, use separate API)
      setStats({
        submitted: data.items?.filter((v: VerificationItem) => v.status === 'submitted').length || 0,
        underReview: data.items?.filter((v: VerificationItem) => v.status === 'under_review').length || 0,
        approved: data.items?.filter((v: VerificationItem) => v.status === 'approved').length || 0,
        rejected: data.items?.filter((v: VerificationItem) => v.status === 'rejected').length || 0,
      });

    } catch (error) {
      console.error('Failed to load CN verifications:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, searchMobile, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle approve
  const handleApprove = async () => {
    if (!confirmDialog.verification) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/cn-verifications/${confirmDialog.verification.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Approval failed');
      }

      setConfirmDialog({ open: false, type: 'approve', verification: null });
      loadData();
    } catch (error: any) {
      console.error('Failed to approve:', error);
      alert(error.message || '审核失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!confirmDialog.verification || !rejectReason.trim()) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/cn-verifications/${confirmDialog.verification.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reject', rejectReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Rejection failed');
      }

      setConfirmDialog({ open: false, type: 'reject', verification: null });
      setRejectReason('');
      loadData();
    } catch (error: any) {
      console.error('Failed to reject:', error);
      alert(error.message || '审核失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  const openApproveDialog = (v: VerificationItem) => {
    setConfirmDialog({ open: true, type: 'approve', verification: v });
  };

  const openRejectDialog = (v: VerificationItem) => {
    setConfirmDialog({ open: true, type: 'reject', verification: v });
    setRejectReason('');
  };

  // Identity type labels
  const typeLabels: Record<string, string> = {
    veterinarian: '执业兽医师',
    assistant_doctor: '助理兽医师',
    nurse_care: '护理/美容师',
    student: '在校学生',
    researcher_teacher: '科研/教育',
  };

  // Status labels for badge
  const statusLabels: Record<string, string> = {
    draft: '草稿',
    submitted: '待审核',
    under_review: '审核中',
    approved: '已通过',
    rejected: '已拒绝',
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">CN站专业认证审核</h1>
        <p className="text-slate-500 text-sm mt-1">审核中国站用户的专业身份认证申请</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="待审核"
          value={stats.submitted}
          icon="⏳"
        />
        <StatCard
          label="审核中"
          value={stats.underReview}
          icon="🔍"
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
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索手机号..."
              value={searchMobile}
              onChange={(e) => {
                setSearchMobile(e.target.value);
                setPage(1);
              }}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as FilterStatus);
                setPage(1);
              }}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'submitted', label: '待审核' },
                { value: 'under_review', label: '审核中' },
                { value: 'approved', label: '已通过' },
                { value: 'rejected', label: '已拒绝' },
              ]}
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部类型' },
                { value: 'veterinarian', label: '执业兽医师' },
                { value: 'assistant_doctor', label: '助理兽医师' },
                { value: 'nurse_care', label: '护理/美容师' },
                { value: 'student', label: '在校学生' },
                { value: 'researcher_teacher', label: '科研/教育' },
              ]}
            />
          </div>
          <Button variant="secondary" onClick={loadData}>
            刷新
          </Button>
        </div>
      </Card>

      {/* List */}
      <Card padding="none">
        {loading ? (
          <LoadingState text="加载审核列表..." />
        ) : verifications.length === 0 ? (
          <EmptyState
            icon="📋"
            title="暂无审核申请"
            description={filterStatus !== 'all' ? '当前筛选条件下没有数据' : '还没有用户提交认证申请'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      申请人
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      手机号
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      认证类型
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      单位/职位
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      专业方向
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
                <tbody className="divide-y divide-slate-100">
                  {verifications.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{v.realName || '-'}</p>
                          <p className="text-xs text-slate-500">{v.user?.displayName || '未设置昵称'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{v.user?.mobile || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                          {typeLabels[v.verificationType] || v.verificationType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{v.organizationName || '-'}</p>
                        <p className="text-xs text-slate-500">{v.positionTitle || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(v.specialtyTags || []).slice(0, 2).map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded">
                              {s}
                            </span>
                          ))}
                          {(v.specialtyTags || []).length > 2 && (
                            <span className="text-[10px] text-slate-500">+{v.specialtyTags.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-400">
                          {v.submittedAt
                            ? new Date(v.submittedAt).toLocaleDateString('zh-CN')
                            : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={v.status as any} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/cn-verifications/${v.id}`}
                            className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                          >
                            详情
                          </Link>
                          {(v.status === 'submitted' || v.status === 'under_review') && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => openApproveDialog(v)}
                              >
                                通过
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => openRejectDialog(v)}
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
            
            {/* Pagination */}
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

      {/* Approve Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'approve'}
        onClose={() => setConfirmDialog({ open: false, type: 'approve', verification: null })}
        onConfirm={handleApprove}
        title="确认审核通过"
        description={`确定要通过 ${confirmDialog.verification?.realName || ''} 的专业认证申请吗？通过后该用户将获得专业认证标识和相应权限。`}
        confirmText="确认通过"
        variant="info"
        loading={actionLoading}
      />

      {/* Reject Dialog */}
      {confirmDialog.open && confirmDialog.type === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDialog({ open: false, type: 'reject', verification: null })} />
          <div className="relative bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">审核拒绝</h3>
                <p className="text-sm text-slate-500">
                  请选择或填写拒绝 {confirmDialog.verification?.realName || ''} 的原因
                </p>
              </div>
            </div>
            
            {/* Preset reasons */}
            <div className="space-y-2 mb-4">
              {[
                '资质材料不清晰，请重新上传',
                '材料信息与填写内容不符',
                '无法确认执业相关信息',
                '请补充完整的证明材料',
                '证件照片需为原件拍照',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                    ${rejectReason === reason
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  {reason}
                </button>
              ))}
            </div>
            
            {/* Custom reason */}
            <textarea
              placeholder="或输入其他拒绝原因..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 resize-none h-20"
            />
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={() => setConfirmDialog({ open: false, type: 'reject', verification: null })}
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
