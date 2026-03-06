'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DoctorApplication } from '@vetsphere/shared/types';
import { getAccessTokenSafe } from '@vetsphere/shared/services/supabase';

interface DoctorAuditTabProps {
  onRefresh?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: '全部', color: 'bg-slate-100 text-slate-700' },
  { value: 'pending_review', label: '待审核', color: 'bg-amber-100 text-amber-700' },
  { value: 'approved', label: '已通过', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: '已拒绝', color: 'bg-red-100 text-red-700' },
  { value: 'draft', label: '草稿', color: 'bg-slate-100 text-slate-500' },
];

const getStatusStyle = (status: string) => {
  const opt = STATUS_OPTIONS.find(o => o.value === status);
  return opt?.color || 'bg-slate-100 text-slate-700';
};

const getStatusLabel = (status: string) => {
  const opt = STATUS_OPTIONS.find(o => o.value === status);
  return opt?.label || status;
};

export default function DoctorAuditTab({ onRefresh }: DoctorAuditTabProps) {
  const [applications, setApplications] = useState<DoctorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<DoctorApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('pending_review');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 获取 access token
  const getAccessToken = async (): Promise<string | null> => {
    return getAccessTokenSafe();
  };

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const response = await fetch(`/api/admin/doctor-applications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // 筛选申请
  const filteredApplications = applications.filter(app => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        app.fullName.toLowerCase().includes(query) ||
        app.phone.includes(query) ||
        app.hospitalName.toLowerCase().includes(query) ||
        app.city.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // 选择申请查看详情
  const handleSelectApp = (app: DoctorApplication) => {
    setSelectedApp(app);
    setRejectReason('');
  };

  // 通过申请
  const handleApprove = async () => {
    if (!selectedApp) return;
    setProcessing(true);
    setMessage(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('未授权');

      const response = await fetch(`/api/admin/doctor-applications/${selectedApp.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'approve' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '操作失败');
      }

      setMessage({ type: 'success', text: '已通过审核' });
      setSelectedApp(null);
      loadApplications();
      onRefresh?.();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setProcessing(false);
    }
  };

  // 拒绝申请
  const handleReject = async () => {
    if (!selectedApp || !rejectReason.trim()) return;
    setProcessing(true);
    setMessage(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('未授权');

      const response = await fetch(`/api/admin/doctor-applications/${selectedApp.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reject', reason: rejectReason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '操作失败');
      }

      setMessage({ type: 'success', text: '已拒绝申请' });
      setSelectedApp(null);
      setShowRejectModal(false);
      setRejectReason('');
      loadApplications();
      onRefresh?.();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setProcessing(false);
    }
  };

  // 格式化时间
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* 标题和消息 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">医生入驻审核</h2>
        {message && (
          <div className={`px-4 py-2 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* 状态筛选 */}
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterStatus === opt.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 搜索 */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索姓名、手机、医院..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {/* 刷新按钮 */}
        <button
          onClick={loadApplications}
          disabled={loading}
          className="px-4 py-2 bg-white text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {/* 主内容区：列表 + 详情 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 申请列表 */}
        <div className="lg:col-span-2 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">加载中...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {filterStatus === 'pending_review' ? '暂无待审核申请' : '暂无数据'}
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredApplications.map(app => (
                <div
                  key={app.id}
                  onClick={() => handleSelectApp(app)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedApp?.id === app.id
                      ? 'bg-emerald-900/20 border-l-2 border-emerald-500'
                      : 'hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 truncate">{app.fullName}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(app.status)}`}>
                          {getStatusLabel(app.status)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 space-y-0.5">
                        <p>{app.hospitalName} · {app.position}</p>
                        <p>{app.city} · {app.phone}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>提交时间</p>
                      <p>{formatDate(app.submittedAt)}</p>
                    </div>
                  </div>
                  {app.specialties && app.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {app.specialties.slice(0, 4).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                          {s}
                        </span>
                      ))}
                      {app.specialties.length > 4 && (
                        <span className="px-2 py-0.5 text-slate-500 text-xs">
                          +{app.specialties.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 详情面板 */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          {selectedApp ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">申请详情</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(selectedApp.status)}`}>
                  {getStatusLabel(selectedApp.status)}
                </span>
              </div>

              {/* 基本信息 */}
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">姓名：</span>
                    <span className="text-slate-900">{selectedApp.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">手机：</span>
                    <span className="text-slate-900">{selectedApp.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">城市：</span>
                    <span className="text-slate-900">{selectedApp.province} {selectedApp.city}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">年限：</span>
                    <span className="text-slate-900">{selectedApp.yearsOfExperience || '-'}年</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">机构：</span>
                  <span className="text-slate-900">{selectedApp.hospitalName}</span>
                </div>
                <div>
                  <span className="text-slate-500">职位：</span>
                  <span className="text-slate-900">{selectedApp.position}</span>
                </div>
                <div>
                  <span className="text-slate-500">专科：</span>
                  <span className="text-slate-900">{selectedApp.specialties?.join('、') || '-'}</span>
                </div>
                {selectedApp.email && (
                  <div>
                    <span className="text-slate-500">邮箱：</span>
                    <span className="text-slate-900">{selectedApp.email}</span>
                  </div>
                )}
                {selectedApp.bio && (
                  <div>
                    <span className="text-slate-500">简介：</span>
                    <p className="text-slate-600 mt-1">{selectedApp.bio}</p>
                  </div>
                )}
              </div>

              {/* 资质材料 */}
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-2">资质材料</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedApp.licenseImageUrl && (
                    <a
                      href={selectedApp.licenseImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={selectedApp.licenseImageUrl}
                        alt="主证明"
                        className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:border-emerald-500 transition-colors"
                      />
                    </a>
                  )}
                  {selectedApp.supplementaryUrls?.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={url}
                        alt={`辅助材料 ${i + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200 hover:border-emerald-500 transition-colors"
                      />
                    </a>
                  ))}
                </div>
                {selectedApp.credentialNotes && (
                  <p className="text-xs text-slate-500 mt-2">备注：{selectedApp.credentialNotes}</p>
                )}
              </div>

              {/* 时间信息 */}
              <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-200">
                <p>创建时间：{formatDate(selectedApp.createdAt)}</p>
                <p>提交时间：{formatDate(selectedApp.submittedAt)}</p>
                {selectedApp.reviewedAt && (
                  <p>审核时间：{formatDate(selectedApp.reviewedAt)}</p>
                )}
              </div>

              {/* 拒绝原因（如果有） */}
              {selectedApp.rejectionReason && (
                <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                  <p className="text-xs text-red-400 font-medium mb-1">拒绝原因</p>
                  <p className="text-sm text-red-300">{selectedApp.rejectionReason}</p>
                </div>
              )}

              {/* 操作按钮 */}
              {selectedApp.status === 'pending_review' && (
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
                  >
                    {processing ? '处理中...' : '通过'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    拒绝
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              选择一个申请查看详情
            </div>
          )}
        </div>
      </div>

      {/* 拒绝弹窗 */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">拒绝申请</h3>
            <p className="text-sm text-slate-500 mb-4">
              请填写拒绝原因，该原因将展示给申请人
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="请输入拒绝原因..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? '处理中...' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
