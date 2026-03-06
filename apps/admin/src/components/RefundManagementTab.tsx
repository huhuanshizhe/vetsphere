'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface RefundItem {
  product_id?: string;
  course_id?: string;
  type: 'product' | 'course';
  name: string;
  quantity: number;
  amount: number;
}

interface Refund {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  reason?: string;
  original_payment_method?: string;
  original_payment_id?: string;
  refund_payment_id?: string;
  processed_by?: string;
  processed_at?: string;
  rejection_reason?: string;
  refund_items?: RefundItem[];
  created_at: string;
  updated_at: string;
  // Joined from orders
  order?: {
    total_amount: number;
    status: string;
    user_email?: string;
    user_name?: string;
  };
}

interface RefundManagementTabProps {
  onRefresh?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已批准',
  rejected: '已拒绝',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  processing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

const RefundManagementTab: React.FC<RefundManagementTabProps> = ({ onRefresh }) => {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadRefunds = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      const response = await fetch(`/api/refunds?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRefunds(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load refunds:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const handleAction = async (refundId: string, action: 'approve' | 'reject' | 'process') => {
    setProcessing(true);
    try {
      const body: { action: string; rejection_reason?: string } = { action };
      if (action === 'reject' && rejectionReason) {
        body.rejection_reason = rejectionReason;
      }

      const response = await fetch(`/api/refunds/${refundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await loadRefunds();
        setSelectedRefund(null);
        setRejectionReason('');
        onRefresh?.();
      } else {
        const error = await response.json();
        alert(error.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to process refund:', error);
      alert('操作失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : currency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingCount = refunds.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">退款管理</h2>
          <p className="text-sm text-slate-500 mt-1">
            审核和处理用户退款申请
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-bold">
                {pendingCount} 待审核
              </span>
            )}
          </p>
        </div>
        <button
          onClick={loadRefunds}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold text-slate-500 hover:bg-white/10 hover:text-slate-900 transition-all min-h-[40px]"
        >
          刷新
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'approved', 'processing', 'completed', 'rejected', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[32px] ${
              filter === status
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10'
            }`}
          >
            {status === 'all' ? '全部' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Refund List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : refunds.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          暂无退款申请
        </div>
      ) : (
        <div className="space-y-3">
          {refunds.map((refund) => (
            <div
              key={refund.id}
              className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:bg-white/[0.04] transition-all cursor-pointer"
              onClick={() => setSelectedRefund(refund)}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-900 font-bold text-sm">
                      #{refund.id.slice(0, 8)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${STATUS_STYLES[refund.status]}`}>
                      {STATUS_LABELS[refund.status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    订单: #{refund.order_id.slice(0, 8)} | 
                    用户: {refund.order?.user_email || refund.user_id.slice(0, 8)}
                  </p>
                  {refund.reason && (
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      原因: {refund.reason}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-black">
                    {formatCurrency(refund.amount, refund.currency)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(refund.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-200/50 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-slate-900">退款详情</h3>
                  <p className="text-xs text-slate-500 mt-1">#{selectedRefund.id}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedRefund(null);
                    setRejectionReason('');
                  }}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-slate-900"
                >
                  x
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">状态:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${STATUS_STYLES[selectedRefund.status]}`}>
                  {STATUS_LABELS[selectedRefund.status]}
                </span>
              </div>

              {/* Amount */}
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">退款金额</p>
                <p className="text-2xl font-black text-emerald-400">
                  {formatCurrency(selectedRefund.amount, selectedRefund.currency)}
                </p>
                {selectedRefund.order && (
                  <p className="text-xs text-slate-500 mt-1">
                    订单总额: {formatCurrency(selectedRefund.order.total_amount, selectedRefund.currency)}
                  </p>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">订单ID</p>
                  <p className="text-slate-900 font-medium">#{selectedRefund.order_id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">用户</p>
                  <p className="text-slate-900 font-medium truncate">
                    {selectedRefund.order?.user_email || selectedRefund.user_id.slice(0, 8)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">支付方式</p>
                  <p className="text-slate-900 font-medium">{selectedRefund.original_payment_method || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">申请时间</p>
                  <p className="text-slate-900 font-medium">{formatDate(selectedRefund.created_at)}</p>
                </div>
              </div>

              {/* Reason */}
              {selectedRefund.reason && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">退款原因</p>
                  <p className="text-slate-900 text-sm bg-white/5 rounded-lg p-3">
                    {selectedRefund.reason}
                  </p>
                </div>
              )}

              {/* Refund Items */}
              {selectedRefund.refund_items && selectedRefund.refund_items.length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs mb-2">退款商品</p>
                  <div className="space-y-2">
                    {selectedRefund.refund_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                        <div>
                          <p className="text-slate-900 text-sm">{item.name}</p>
                          <p className="text-slate-500 text-xs">
                            {item.type === 'course' ? '课程' : '商品'} x {item.quantity}
                          </p>
                        </div>
                        <p className="text-emerald-400 font-bold">
                          {formatCurrency(item.amount, selectedRefund.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Reason (for rejected status or input) */}
              {selectedRefund.rejection_reason && (
                <div>
                  <p className="text-red-400 text-xs mb-1">拒绝原因</p>
                  <p className="text-slate-600 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    {selectedRefund.rejection_reason}
                  </p>
                </div>
              )}

              {/* Actions */}
              {selectedRefund.status === 'pending' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">拒绝原因 (如需拒绝)</label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="请输入拒绝原因..."
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-900 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/20"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(selectedRefund.id, 'approve')}
                      disabled={processing}
                      className="flex-1 py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 min-h-[48px]"
                    >
                      {processing ? '处理中...' : '批准'}
                    </button>
                    <button
                      onClick={() => handleAction(selectedRefund.id, 'reject')}
                      disabled={processing || !rejectionReason}
                      className="flex-1 py-3 bg-red-500/20 text-red-400 font-bold rounded-xl border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50 min-h-[48px]"
                    >
                      {processing ? '处理中...' : '拒绝'}
                    </button>
                  </div>
                </div>
              )}

              {selectedRefund.status === 'approved' && (
                <div className="pt-2">
                  <button
                    onClick={() => handleAction(selectedRefund.id, 'process')}
                    disabled={processing}
                    className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-400 transition-all disabled:opacity-50 min-h-[48px]"
                  >
                    {processing ? '处理中...' : '执行退款'}
                  </button>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    点击后将通过原支付渠道退款
                  </p>
                </div>
              )}

              {/* Processing Info */}
              {selectedRefund.processed_at && (
                <div className="text-xs text-slate-500 border-t border-white/5 pt-3">
                  处理时间: {formatDate(selectedRefund.processed_at)}
                  {selectedRefund.refund_payment_id && (
                    <span className="ml-2">| 退款ID: {selectedRefund.refund_payment_id}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundManagementTab;
