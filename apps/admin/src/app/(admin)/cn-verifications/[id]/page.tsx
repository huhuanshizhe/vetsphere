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
import { supabase } from '@vetsphere/shared/services/supabase';

interface Document {
  id: string;
  fileId: string;
  fileUrl: string;
  fileName: string | null;
  fileType: string;
  docType: string;
  docTypeDesc: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  adminName: string | null;
  fromStatus: string | null;
  toStatus: string;
  rejectReason: string | null;
  reviewNote: string | null;
  createdAt: string;
}

interface VerificationData {
  verification: {
    id: string;
    userId: string;
    verificationType: string;
    status: string;
    realName: string;
    organizationName: string;
    positionTitle: string;
    specialtyTags: string[];
    verificationNote: string | null;
    typeSpecificFields: Record<string, any>;
    agreeVerificationStatement: boolean;
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    rejectReason: string | null;
    approvedLevel: string | null;
    snapshotJson: any;
    documents: Document[];
    createdAt: string;
    updatedAt: string;
  };
  user: {
    mobile: string;
    status: string;
    registeredAt: string | null;
    lastLoginAt: string | null;
  } | null;
  profile: {
    displayName: string | null;
    realName: string | null;
    avatarUrl: string | null;
    organizationName: string | null;
    jobTitle: string | null;
    experienceYears: number | null;
    interestTags: string[];
    bio: string | null;
    identityFields: Record<string, any>;
  } | null;
  identity: {
    identityType: string;
    identityGroup: string;
    identityGroupV2: string | null;
    doctorSubtype: string | null;
    identitySelectedAt: string | null;
  } | null;
  auditLogs: AuditLog[];
}

// 认证类型标签
const TYPE_LABELS: Record<string, string> = {
  veterinarian: '执业兽医师',
  assistant_doctor: '助理兽医师',
  rural_veterinarian: '乡村兽医',
};

// 文档类型标签
const DOC_TYPE_LABELS: Record<string, string> = {
  license: '执业资格证',
  profile_page: '身份证',
  employment_proof: '工作证明',
  other: '其他证明',
};

// 状态配置
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: '草稿', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  submitted: { label: '待审核', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  approved: { label: '已通过', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  rejected: { label: '已驳回', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
};

export default function CnVerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // 操作状态
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'start_review';
  }>({ open: false, type: 'approve' });
  const [rejectReason, setRejectReason] = useState('');

  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      if (!token) { setError('未登录'); return; }

      const res = await fetch(`/api/v1/admin/cn-verifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '加载失败');
      }
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleAction = async (action: 'approve' | 'reject' | 'start_review', reason?: string) => {
    setActionLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/v1/admin/cn-verifications/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, rejectReason: reason }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '操作失败');
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

  if (loading) return <LoadingState text="加载认证详情..." />;

  if (error || !data) {
    return (
      <Card className="text-center py-12">
        <p className="text-red-600 mb-4">{error || '未找到认证申请'}</p>
        <Button onClick={() => router.back()}>返回列表</Button>
      </Card>
    );
  }

  const v = data.verification;
  const statusCfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.draft;
  const canReview = v.status === 'submitted';
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url);

  return (
    <>
      {/* ===== 顶部导航栏 ===== */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/cn-verifications" className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-500 hover:text-slate-900">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">认证审核详情</h1>
            <p className="text-xs text-slate-500 mt-0.5">ID: {v.id}</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
          <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ===== 左侧主内容区 (2/3) ===== */}
        <div className="xl:col-span-2 space-y-6">

          {/* --- 申请人基本信息 --- */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-blue-500 rounded-full" />
              <h2 className="text-base font-bold text-slate-900">申请人信息</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
              <InfoField label="真实姓名" value={v.realName} highlight />
              <InfoField label="手机号" value={data.user?.mobile} />
              <InfoField label="认证类型" value={TYPE_LABELS[v.verificationType] || v.verificationType} badge="blue" />
              <InfoField label="所在单位/机构" value={v.organizationName} />
              <InfoField label="职位/职称" value={v.positionTitle} />
              <InfoField label="昵称" value={data.profile?.displayName} />
            </div>
            {v.specialtyTags && v.specialtyTags.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">专业方向</p>
                <div className="flex flex-wrap gap-2">
                  {v.specialtyTags.map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {v.verificationNote && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">补充说明</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{v.verificationNote}</p>
              </div>
            )}
          </Card>

          {/* --- 证明材料 --- */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                <h2 className="text-base font-bold text-slate-900">证明材料</h2>
                <span className="text-xs text-slate-500 ml-1">({v.documents?.length || 0} 份)</span>
              </div>
            </div>
            {v.documents && v.documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {v.documents.map((doc) => (
                  <div key={doc.id} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                    {/* 文档类型头部 */}
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{doc.docType === 'license' ? '📜' : doc.docType === 'profile_page' ? '🪪' : doc.docType === 'employment_proof' ? '📋' : '📄'}</span>
                        <span className="text-sm font-medium text-slate-700">{doc.docTypeDesc || DOC_TYPE_LABELS[doc.docType] || doc.docType}</span>
                      </div>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        新窗口打开
                      </a>
                    </div>
                    {/* 预览区域 */}
                    {isImage(doc.fileUrl) ? (
                      <div 
                        className="relative cursor-pointer bg-white"
                        onClick={() => setPreviewImage(doc.fileUrl)}
                      >
                        <img
                          src={doc.fileUrl}
                          alt={doc.docTypeDesc || doc.docType}
                          className="w-full h-56 object-contain p-2 group-hover:scale-[1.02] transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-slate-900 text-xs px-3 py-1.5 rounded-full">
                            点击放大查看
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 bg-slate-50">
                        <svg className="w-10 h-10 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs text-slate-500">{doc.fileName || 'PDF 文件'}</p>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-blue-600 hover:underline">
                          下载查看
                        </a>
                      </div>
                    )}
                    {/* 文件名 */}
                    {doc.fileName && (
                      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs text-slate-500 truncate" title={doc.fileName}>{doc.fileName}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <p className="text-slate-500 text-sm">申请人未上传任何证明材料</p>
              </div>
            )}
          </Card>

          {/* --- 审核记录 --- */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-purple-500 rounded-full" />
              <h2 className="text-base font-bold text-slate-900">审核记录</h2>
            </div>
            {data.auditLogs && data.auditLogs.length > 0 ? (
              <div className="relative pl-6">
                {/* 时间线竖线 */}
                <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-200" />
                <div className="space-y-5">
                  {data.auditLogs.map((log) => {
                    const actionConfig: Record<string, { icon: string; label: string; color: string }> = {
                      submit: { icon: '📤', label: '提交申请', color: 'bg-blue-100' },
                      start_review: { icon: '🔍', label: '开始审核', color: 'bg-sky-100' },
                      approve: { icon: '✅', label: '审核通过', color: 'bg-emerald-100' },
                      reject: { icon: '❌', label: '审核驳回', color: 'bg-red-100' },
                    };
                    const cfg = actionConfig[log.action] || { icon: '📝', label: log.action, color: 'bg-slate-100' };
                    return (
                      <div key={log.id} className="relative flex gap-4">
                        <div className={`absolute -left-6 w-[18px] h-[18px] rounded-full ${cfg.color} flex items-center justify-center text-[10px] z-10 ring-2 ring-white`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{cfg.label}</span>
                            {log.adminName && <span className="text-xs text-slate-500">by {log.adminName}</span>}
                          </div>
                          {log.rejectReason && <p className="text-sm text-red-600 mt-1 bg-red-50 rounded-lg px-3 py-1.5">{log.rejectReason}</p>}
                          {log.reviewNote && <p className="text-sm text-slate-600 mt-1">{log.reviewNote}</p>}
                          <p className="text-xs text-slate-500 mt-1">{new Date(log.createdAt).toLocaleString('zh-CN')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">暂无审核记录</p>
              </div>
            )}
          </Card>
        </div>

        {/* ===== 右侧边栏 (1/3) ===== */}
        <div className="space-y-6">

          {/* --- 审核操作 --- */}
          {canReview && (
            <Card className="border-2 border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                <h2 className="text-base font-bold text-slate-900">审核操作</h2>
              </div>
              <div className="space-y-3">
                <Button variant="primary" className="w-full" onClick={() => setConfirmDialog({ open: true, type: 'approve' })}>
                  通过认证
                </Button>
                <Button variant="danger" className="w-full" onClick={() => setConfirmDialog({ open: true, type: 'reject' })}>
                  驳回申请
                </Button>
              </div>
            </Card>
          )}

          {/* --- 驳回原因（如已驳回）--- */}
          {v.status === 'rejected' && v.rejectReason && (
            <Card className="border border-red-200 bg-red-50/50">
              <h3 className="text-sm font-bold text-red-700 mb-2">驳回原因</h3>
              <p className="text-sm text-red-600">{v.rejectReason}</p>
              {v.reviewedAt && (
                <p className="text-xs text-red-400 mt-2">
                  驳回时间：{new Date(v.reviewedAt).toLocaleString('zh-CN')}
                </p>
              )}
            </Card>
          )}

          {/* --- 用户账号信息 --- */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-slate-400 rounded-full" />
              <h2 className="text-base font-bold text-slate-900">用户账号</h2>
            </div>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
              {data.profile?.avatarUrl ? (
                <img src={data.profile.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-slate-900 font-bold text-lg">
                  {v.realName?.[0] || '?'}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{data.profile?.displayName || v.realName || '未设置'}</p>
                <p className="text-xs text-slate-500">{data.user?.mobile || '-'}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <SidebarRow label="账号状态" value={data.user?.status === 'active' ? '正常' : data.user?.status || '-'} />
              <SidebarRow label="身份分组" value={data.identity?.identityGroupV2 || data.identity?.identityGroup || '-'} />
              <SidebarRow label="医生子类型" value={data.identity?.doctorSubtype || '-'} />
              <SidebarRow label="注册时间" value={data.user?.registeredAt ? new Date(data.user.registeredAt).toLocaleDateString('zh-CN') : '-'} />
              <SidebarRow label="最近登录" value={data.user?.lastLoginAt ? new Date(data.user.lastLoginAt).toLocaleDateString('zh-CN') : '-'} />
              {data.identity?.identitySelectedAt && (
                <SidebarRow label="身份选择时间" value={new Date(data.identity.identitySelectedAt).toLocaleDateString('zh-CN')} />
              )}
            </div>
          </Card>

          {/* --- 时间线 --- */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-amber-400 rounded-full" />
              <h2 className="text-base font-bold text-slate-900">申请时间线</h2>
            </div>
            <div className="space-y-3 text-sm">
              <SidebarRow label="创建时间" value={new Date(v.createdAt).toLocaleString('zh-CN')} />
              {v.submittedAt && <SidebarRow label="提交时间" value={new Date(v.submittedAt).toLocaleString('zh-CN')} />}
              {v.reviewedAt && <SidebarRow label="审核时间" value={new Date(v.reviewedAt).toLocaleString('zh-CN')} />}
              <SidebarRow label="最后更新" value={new Date(v.updatedAt).toLocaleString('zh-CN')} />
            </div>
          </Card>

          {/* --- 用户简介（如有）--- */}
          {data.profile?.bio && (
            <Card>
              <h3 className="text-sm font-bold text-slate-700 mb-2">个人简介</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{data.profile.bio}</p>
            </Card>
          )}
        </div>
      </div>

      {/* ===== 图片放大预览模态框 ===== */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-5xl max-h-[90vh] w-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-slate-900/80 hover:text-slate-900 text-sm flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              关闭
            </button>
            <img
              src={previewImage}
              alt="预览"
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
              <a href={previewImage} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/20 backdrop-blur text-slate-900 text-sm rounded-full hover:bg-white/30 transition">
                在新标签打开原图
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===== 通过确认弹窗 ===== */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'approve'}
        onClose={() => setConfirmDialog({ open: false, type: 'approve' })}
        onConfirm={() => handleAction('approve')}
        title="确认通过认证"
        description={`确定要通过「${v.realName || ''}」（${TYPE_LABELS[v.verificationType] || v.verificationType}）的认证申请吗？通过后该用户将获得医生工作台访问权限。`}
        confirmText="确认通过"
        variant="info"
        loading={actionLoading}
      />

      {/* ===== 驳回弹窗 ===== */}
      {confirmDialog.open && confirmDialog.type === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDialog({ open: false, type: 'reject' })} />
          <div className="relative bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-lg flex-shrink-0">
                ⚠️
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">驳回认证申请</h3>
                <p className="text-sm text-slate-500 mt-1">
                  请选择或填写驳回「{v.realName || ''}」认证的原因，用户将收到驳回通知
                </p>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              {[
                '资质材料不清晰，请重新上传高清照片',
                '上传的材料与填写的身份类型不符',
                '无法确认执业资格证的有效性',
                '请补充完整的证明材料（如身份证、工作证明）',
                '证件照片需为原件拍照，不接受复印件',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                    rejectReason === reason
                      ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            
            <textarea
              placeholder="或输入自定义驳回原因..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none h-20"
            />
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setConfirmDialog({ open: false, type: 'reject' })} disabled={actionLoading}>取消</Button>
              <Button variant="danger" onClick={() => handleAction('reject', rejectReason)} loading={actionLoading} disabled={!rejectReason.trim()}>
                确认驳回
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===== 子组件 ===== */

function InfoField({ label, value, highlight, badge }: { label: string; value?: string | null; highlight?: boolean; badge?: 'blue' | 'green' | 'amber' }) {
  const badgeColors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      {badge && value ? (
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColors[badge]}`}>{value}</span>
      ) : (
        <p className={`text-sm ${highlight ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{value || '-'}</p>
      )}
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}
