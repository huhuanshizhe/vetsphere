'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import { useSite } from '@/context/SiteContext';
import { PermissionGate } from '@/components/PermissionGate';

type FilterStatus = 'all' | 'submitted' | 'under_review' | 'approved' | 'rejected';
type IntegrityFilter =
  | 'all'
  | 'healthy'
  | 'anomalies'
  | 'missing_directory_user'
  | 'latest_status_not_approved'
  | 'historical_approved_superseded';

interface VerificationItem {
  id: string;
  userId: string;
  siteCode: 'cn' | 'intl';
  status: string;
  verificationType: string;
  realName: string | null;
  organizationName: string | null;
  positionTitle: string | null;
  specialtyTags: string[];
  submittedAt: string | null;
  reviewedAt: string | null;
  approvedLevel: string | null;
  rejectReason: string | null;
  contact: string | null;
  email: string | null;
  mobile: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  identityType: string | null;
  identityGroup: string | null;
  hasDirectoryUser: boolean;
  isLatestVerification: boolean;
  latestVerificationId: string | null;
  latestVerificationStatus: string | null;
  integrityIssueCode: null | 'missing_directory_user' | 'latest_status_not_approved' | 'historical_approved_superseded';
  integrityState: 'healthy' | 'anomaly';
}

interface VerificationsResponse {
  items: VerificationItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  siteCode: 'cn' | 'intl' | 'global';
  stats: {
    total: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    anomalies: number;
  };
}

const TYPE_LABELS: Record<string, string> = {
  veterinarian: '执业兽医师',
  assistant_doctor: '助理兽医师',
  nurse_care: '护理/美容师',
  student: '在校学生',
  researcher_teacher: '科研/教育',
  industry_practitioner: '行业从业者',
  general_practitioner: 'General Practitioner',
  specialist: 'Specialist',
  clinic_owner: 'Clinic Owner',
  technician: 'Technician',
  other: '其他',
};

const INTEGRITY_LABELS: Record<Exclude<IntegrityFilter, 'all' | 'healthy' | 'anomalies'>, { label: string; className: string }> = {
  missing_directory_user: {
    label: '缺少目录用户',
    className: 'bg-red-50 text-red-700',
  },
  latest_status_not_approved: {
    label: '最新状态已变更',
    className: 'bg-amber-50 text-amber-700',
  },
  historical_approved_superseded: {
    label: '历史 approved 旧记录',
    className: 'bg-slate-100 text-slate-700',
  },
};

export default function VerificationsPage() {
  const { currentSite } = useSite();
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    anomalies: 0,
  });

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState('');
  const [integrityFilter, setIntegrityFilter] = useState<IntegrityFilter>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    verification: VerificationItem | null;
  }>({ open: false, type: 'approve', verification: null });
  const [rejectReason, setRejectReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('site_code', currentSite || 'global');
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterType) params.set('type', filterType);
      if (integrityFilter !== 'all') params.set('integrity', integrityFilter);
      if (searchKeyword) params.set('keyword', searchKeyword);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const data = await apiFetch<VerificationsResponse>(`/api/v1/admin/verifications?${params.toString()}`);
      setVerifications(data.items || []);
      setTotal(data.total || 0);
      setStats(data.stats || { total: 0, pendingReview: 0, approved: 0, rejected: 0, anomalies: 0 });
    } catch (error) {
      console.error('Failed to load verifications:', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [currentSite, filterStatus, filterType, integrityFilter, searchKeyword, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async () => {
    if (!confirmDialog.verification) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      await apiFetch(`/api/v1/admin/verifications/${confirmDialog.verification.id}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      });

      setActionMessage({ type: 'success', text: `已通过 ${confirmDialog.verification.realName || '该用户'} 的认证申请` });
      setConfirmDialog({ open: false, type: 'approve', verification: null });
      loadData();
    } catch (error) {
      setActionMessage({ type: 'error', text: getErrorMessage(error) || '审核失败，请重试' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirmDialog.verification || !rejectReason.trim()) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      await apiFetch(`/api/v1/admin/verifications/${confirmDialog.verification.id}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'reject', rejectReason }),
      });

      setActionMessage({ type: 'success', text: `已驳回 ${confirmDialog.verification.realName || '该用户'} 的认证申请` });
      setConfirmDialog({ open: false, type: 'reject', verification: null });
      setRejectReason('');
      loadData();
    } catch (error) {
      setActionMessage({ type: 'error', text: getErrorMessage(error) || '审核失败，请重试' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {actionMessage && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between ${
          actionMessage.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">医生认证</h1>
        <p className="text-slate-500 text-sm mt-1">
          原始审核工作台。这里保留所有认证申请，并显式标记孤儿记录、历史 approved 旧记录和最新状态已变更的异常。
          {currentSite && currentSite !== 'global' && (
            <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded">
              {currentSite.toUpperCase()}
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="总申请" value={stats.total} />
        <StatCard label="待处理" value={stats.pendingReview} />
        <StatCard label="已通过" value={stats.approved} />
        <StatCard label="已驳回" value={stats.rejected} />
        <StatCard label="异常记录" value={stats.anomalies} />
      </div>

      <Card className="mb-6">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索姓名 / 单位 / 联系方式..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-full xl:w-40">
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
                { value: 'rejected', label: '已驳回' },
              ]}
            />
          </div>
          <div className="w-full xl:w-44">
            <Select
              value={integrityFilter}
              onChange={(e) => {
                setIntegrityFilter(e.target.value as IntegrityFilter);
                setPage(1);
              }}
              options={[
                { value: 'all', label: '全部记录' },
                { value: 'healthy', label: '仅正常记录' },
                { value: 'anomalies', label: '仅异常记录' },
                { value: 'missing_directory_user', label: '缺少目录用户' },
                { value: 'latest_status_not_approved', label: '最新状态已变更' },
                { value: 'historical_approved_superseded', label: '历史 approved 旧记录' },
              ]}
            />
          </div>
          <div className="w-full xl:w-44">
            <Select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部类型' },
                ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
          </div>
          <Button variant="secondary" onClick={loadData}>刷新</Button>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState text="加载审核工作台..." />
        ) : verifications.length === 0 ? (
          <EmptyState icon="📋" title="暂无认证申请" description="当前筛选条件下没有匹配的认证记录" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">申请人</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">联系方式</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">认证类型</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">单位 / 职位</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">完整性</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">状态</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">提交时间</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {verifications.map((verification) => {
                    const integrityMeta = verification.integrityIssueCode
                      ? INTEGRITY_LABELS[verification.integrityIssueCode]
                      : null;

                    return (
                      <tr key={verification.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{verification.realName || '-'}</p>
                          <p className="text-xs text-slate-500">{verification.displayName || '未设置昵称'}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{verification.siteCode.toUpperCase()}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{verification.contact || verification.email || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                            {TYPE_LABELS[verification.verificationType] || verification.verificationType}
                          </span>
                          {verification.approvedLevel && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 rounded">
                              {verification.approvedLevel}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{verification.organizationName || '-'}</p>
                          <p className="text-xs text-slate-500">{verification.positionTitle || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          {integrityMeta ? (
                            <div className="space-y-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${integrityMeta.className}`}>
                                {integrityMeta.label}
                              </span>
                              {verification.latestVerificationStatus && (
                                <p className="text-[11px] text-slate-500">最新状态：{verification.latestVerificationStatus}</p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                              正常
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={verification.status as any} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-500">
                            {verification.submittedAt ? new Date(verification.submittedAt).toLocaleDateString('zh-CN') : '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3 text-xs">
                            {verification.hasDirectoryUser && (
                              <Link href={`/users/${verification.userId}?site=${verification.siteCode}`} className="text-slate-500 hover:text-slate-900 transition-colors">
                                用户
                              </Link>
                            )}
                            <Link href={`/verifications/${verification.id}`} className="text-slate-500 hover:text-slate-900 transition-colors">
                              详情
                            </Link>
                            {(verification.status === 'submitted' || verification.status === 'under_review' || verification.status === 'pending_review') && (
                              <>
                                <PermissionGate code="doctor_verify.approve">
                                  <Button size="sm" variant="primary" onClick={() => setConfirmDialog({ open: true, type: 'approve', verification })}>
                                    通过
                                  </Button>
                                </PermissionGate>
                                <PermissionGate code="doctor_verify.reject">
                                  <Button size="sm" variant="danger" onClick={() => { setConfirmDialog({ open: true, type: 'reject', verification }); setRejectReason(''); }}>
                                    拒绝
                                  </Button>
                                </PermissionGate>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 pb-4">
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'approve'}
        onClose={() => setConfirmDialog({ open: false, type: 'approve', verification: null })}
        onConfirm={handleApprove}
        title="确认审核通过"
        description={`确定要通过 ${confirmDialog.verification?.realName || ''} 的认证申请吗？通过后该用户将进入已认证医生名册。`}
        confirmText="确认通过"
        variant="info"
        loading={actionLoading}
      />

      {confirmDialog.open && confirmDialog.type === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDialog({ open: false, type: 'reject', verification: null })} />
          <div className="relative bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">审核拒绝</h3>
                <p className="text-sm text-slate-500">请选择或填写拒绝 {confirmDialog.verification?.realName || ''} 的原因</p>
              </div>
            </div>

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
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition ${
                    rejectReason === reason
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入具体的拒绝原因..."
              className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setConfirmDialog({ open: false, type: 'reject', verification: null })}>
                取消
              </Button>
              <Button variant="danger" onClick={handleReject} disabled={!rejectReason.trim()} loading={actionLoading}>
                确认拒绝
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}