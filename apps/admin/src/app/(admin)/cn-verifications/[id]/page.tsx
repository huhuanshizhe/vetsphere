'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Card, 
  Button, 
  StatusBadge, 
  LoadingState, 
  ConfirmDialog,
} from '@/components/ui';

interface VerificationDetail {
  id: string;
  userId: string;
  status: string;
  verificationType: string;
  realName: string;
  organizationName: string;
  positionTitle: string;
  specialtyTags: string[];
  typeSpecificFields: Record<string, any>;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectReason: string | null;
  approvedLevel: string | null;
  snapshotJson: any;
  user: {
    id: string;
    mobile: string;
    status: string;
    createdAt: string;
  };
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    interestTags: string[] | null;
    bio: string | null;
  };
  identity: {
    identityType: string;
    identityGroup: string;
  };
  documents: Array<{
    id: string;
    documentType: string;
    documentUrl: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    oldStatus: string | null;
    newStatus: string;
    reason: string | null;
    performedBy: string | null;
    performedAt: string;
  }>;
}

export default function CnVerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [verification, setVerification] = useState<VerificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'start_review';
  }>({ open: false, type: 'approve' });
  const [rejectReason, setRejectReason] = useState('');

  // Load verification detail
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/admin/cn-verifications/${id}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load verification');
      }

      const data = await res.json();
      setVerification(data);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Handle action
  const handleAction = async (action: 'approve' | 'reject' | 'start_review', reason?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/cn-verifications/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, rejectReason: reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }

      setConfirmDialog({ open: false, type: 'approve' });
      setRejectReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || '操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // Type labels
  const typeLabels: Record<string, string> = {
    veterinarian: '执业兽医师',
    assistant_doctor: '助理兽医师',
    nurse_care: '护理/美容师',
    student: '在校学生',
    researcher_teacher: '科研/教育工作者',
  };

  // Status labels
  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: '草稿', color: 'text-slate-500' },
    submitted: { label: '待审核', color: 'text-amber-600' },
    under_review: { label: '审核中', color: 'text-blue-600' },
    approved: { label: '已通过', color: 'text-emerald-600' },
    rejected: { label: '已拒绝', color: 'text-red-600' },
  };

  if (loading) {
    return <LoadingState text="加载认证详情..." />;
  }

  if (error || !verification) {
    return (
      <Card className="text-center py-12">
        <p className="text-red-600 mb-4">{error || '未找到认证申请'}</p>
        <Button onClick={() => router.back()}>返回列表</Button>
      </Card>
    );
  }

  const statusInfo = statusLabels[verification.status] || { label: verification.status, color: 'text-slate-400' };
  const canReview = verification.status === 'submitted' || verification.status === 'under_review';

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/cn-verifications"
            className="text-slate-400 hover:text-slate-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">认证详情</h1>
            <p className="text-slate-500 text-sm">申请ID: {verification.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color} bg-slate-100`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">基本信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">真实姓名</p>
                <p className="text-slate-900 font-medium">{verification.realName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">手机号</p>
                <p className="text-slate-900 font-medium">{verification.user?.mobile || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">认证类型</p>
                <p className="text-slate-900 font-medium">
                  {typeLabels[verification.verificationType] || verification.verificationType}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">身份分组</p>
                <p className="text-slate-900 font-medium">{verification.identity?.identityGroup || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">所在单位</p>
                <p className="text-slate-900 font-medium">{verification.organizationName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">职位/角色</p>
                <p className="text-slate-900 font-medium">{verification.positionTitle || '-'}</p>
              </div>
            </div>
            
            {/* Specialty Tags */}
            {verification.specialtyTags && verification.specialtyTags.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-slate-400 mb-2">专业方向</p>
                <div className="flex flex-wrap gap-2">
                  {verification.specialtyTags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Documents */}
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">证明材料</h2>
            {verification.documents && verification.documents.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {verification.documents.map((doc) => (
                  <div key={doc.id} className="bg-slate-100 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-2">{doc.documentType}</p>
                    {doc.documentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <a
                        href={doc.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={doc.documentUrl}
                          alt={doc.documentType}
                          className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ) : (
                      <a
                        href={doc.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center h-32 bg-slate-100 rounded text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">暂无上传材料</p>
            )}
          </Card>

          {/* Audit Logs */}
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">审核记录</h2>
            {verification.auditLogs && verification.auditLogs.length > 0 ? (
              <div className="space-y-4">
                {verification.auditLogs.map((log) => (
                  <div key={log.id} className="flex gap-4 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                      {log.action === 'approve' && '✅'}
                      {log.action === 'reject' && '❌'}
                      {log.action === 'submit' && '📤'}
                      {log.action === 'start_review' && '🔍'}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 font-medium">
                        {log.action === 'approve' && '审核通过'}
                        {log.action === 'reject' && '审核拒绝'}
                        {log.action === 'submit' && '提交申请'}
                        {log.action === 'start_review' && '开始审核'}
                      </p>
                      {log.reason && (
                        <p className="text-sm text-red-600 mt-1">{log.reason}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(log.performedAt).toLocaleString('zh-CN')}
                        {log.performedBy && ` · ${log.performedBy}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">暂无审核记录</p>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">用户信息</h2>
            <div className="flex items-center gap-3 mb-4">
              {verification.profile?.avatarUrl ? (
                <img
                  src={verification.profile.avatarUrl}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
                  {verification.realName?.[0] || '?'}
                </div>
              )}
              <div>
                <p className="text-slate-900 font-medium">{verification.profile?.displayName || '未设置昵称'}</p>
                <p className="text-sm text-slate-400">{verification.user?.mobile}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">账号状态</span>
                <span className="text-slate-900">{verification.user?.status || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">注册时间</span>
                <span className="text-slate-900">
                  {verification.user?.createdAt 
                    ? new Date(verification.user.createdAt).toLocaleDateString('zh-CN')
                    : '-'}
                </span>
              </div>
            </div>
          </Card>

          {/* Rejection Reason */}
          {verification.status === 'rejected' && verification.rejectReason && (
            <Card className="border-red-200">
              <h2 className="text-lg font-semibold text-red-600 mb-2">拒绝原因</h2>
              <p className="text-slate-700">{verification.rejectReason}</p>
            </Card>
          )}

          {/* Actions */}
          {canReview && (
            <Card>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">审核操作</h2>
              <div className="space-y-3">
                {verification.status === 'submitted' && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleAction('start_review')}
                    loading={actionLoading}
                  >
                    开始审核
                  </Button>
                )}
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setConfirmDialog({ open: true, type: 'approve' })}
                >
                  审核通过
                </Button>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setConfirmDialog({ open: true, type: 'reject' })}
                >
                  审核拒绝
                </Button>
              </div>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">时间线</h2>
            <div className="space-y-3 text-sm">
              {verification.submittedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-400">提交时间</span>
                  <span className="text-slate-900">
                    {new Date(verification.submittedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
              {verification.reviewedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-400">审核时间</span>
                  <span className="text-slate-900">
                    {new Date(verification.reviewedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Approve Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'approve'}
        onClose={() => setConfirmDialog({ open: false, type: 'approve' })}
        onConfirm={() => handleAction('approve')}
        title="确认审核通过"
        description={`确定要通过 ${verification?.realName || ''} 的专业认证申请吗？通过后该用户将获得专业认证标识和相应权限。`}
        confirmText="确认通过"
        variant="info"
        loading={actionLoading}
      />

      {/* Reject Dialog */}
      {confirmDialog.open && confirmDialog.type === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDialog({ open: false, type: 'reject' })} />
          <div className="relative bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">审核拒绝</h3>
                <p className="text-sm text-slate-500">
                  请选择或填写拒绝 {verification?.realName || ''} 的原因
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
                onClick={() => setConfirmDialog({ open: false, type: 'reject' })}
                disabled={actionLoading}
              >
                取消
              </Button>
              <Button 
                variant="danger" 
                onClick={() => handleAction('reject', rejectReason)} 
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
