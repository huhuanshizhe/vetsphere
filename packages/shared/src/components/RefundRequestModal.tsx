'use client';

import React, { useState } from 'react';
import { Order } from '../types';

interface RefundItem {
  product_id?: string;
  course_id?: string;
  type: 'product' | 'course';
  name: string;
  quantity: number;
  amount: number;
}

interface RefundRequestModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  locale?: string;
}

const translations = {
  zh: {
    title: '申请退款',
    orderNumber: '订单号',
    orderTotal: '订单金额',
    refundableAmount: '可退金额',
    refundAmount: '退款金额',
    refundReason: '退款原因',
    selectReason: '请选择退款原因',
    reasonQuality: '商品质量问题',
    reasonNotMatch: '商品与描述不符',
    reasonNotNeed: '不需要了',
    reasonSchedule: '课程时间冲突',
    reasonOther: '其他原因',
    otherReasonPlaceholder: '请描述您的退款原因...',
    selectItems: '选择退款商品',
    allItems: '全部退款',
    partialItems: '部分退款',
    submit: '提交申请',
    submitting: '提交中...',
    cancel: '取消',
    success: '退款申请已提交',
    successDesc: '我们将在1-3个工作日内处理您的申请',
    error: '提交失败',
    errorDesc: '请稍后重试',
    alreadyRefunding: '该订单已有退款申请正在处理中',
    invalidAmount: '退款金额无效',
    tips: '提示',
    tipContent: '退款将原路返回至您的支付账户，预计3-7个工作日到账',
  },
  en: {
    title: 'Request Refund',
    orderNumber: 'Order ID',
    orderTotal: 'Order Total',
    refundableAmount: 'Refundable Amount',
    refundAmount: 'Refund Amount',
    refundReason: 'Reason for Refund',
    selectReason: 'Select a reason',
    reasonQuality: 'Quality issues',
    reasonNotMatch: 'Not as described',
    reasonNotNeed: 'No longer needed',
    reasonSchedule: 'Schedule conflict',
    reasonOther: 'Other',
    otherReasonPlaceholder: 'Please describe your reason...',
    selectItems: 'Select Items',
    allItems: 'Full Refund',
    partialItems: 'Partial Refund',
    submit: 'Submit Request',
    submitting: 'Submitting...',
    cancel: 'Cancel',
    success: 'Refund Request Submitted',
    successDesc: 'We will process your request within 1-3 business days',
    error: 'Submission Failed',
    errorDesc: 'Please try again later',
    alreadyRefunding: 'A refund request is already being processed for this order',
    invalidAmount: 'Invalid refund amount',
    tips: 'Note',
    tipContent: 'Refund will be returned to your original payment method within 3-7 business days',
  },
};

const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
  locale = 'zh',
}) => {
  const t = translations[locale as keyof typeof translations] || translations.zh;
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(order.items?.map((_, idx) => idx) || [])
  );

  // Calculate amounts
  const orderTotal = order.totalAmount || 0;
  const refundedAmount = (order as any).refunded_amount || 0;
  const refundableAmount = orderTotal - refundedAmount;

  const calculateRefundAmount = () => {
    if (refundType === 'full') return refundableAmount;
    if (!order.items) return 0;
    
    let total = 0;
    selectedItems.forEach(idx => {
      const item = order.items![idx];
      if (item) {
        total += (item.price || 0) * (item.quantity || 1);
      }
    });
    return Math.min(total, refundableAmount);
  };

  const refundAmount = calculateRefundAmount();

  const handleItemToggle = (idx: number) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedItems(newSet);
  };

  const handleSubmit = async () => {
    if (!reason) return;
    if (refundAmount <= 0) return;

    setLoading(true);
    setErrorMessage('');

    try {
      // Build refund items
      const refundItems: RefundItem[] = [];
      if (order.items) {
        selectedItems.forEach(idx => {
          const item = order.items![idx];
          if (item) {
            refundItems.push({
              product_id: item.type === 'product' ? item.id : undefined,
              course_id: item.type === 'course' ? item.id : undefined,
              type: item.type || 'product',
              name: item.name,
              quantity: item.quantity || 1,
              amount: (item.price || 0) * (item.quantity || 1),
            });
          }
        });
      }

      const response = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amount: refundAmount,
          reason: reason === 'other' ? otherReason : reason,
          refund_items: refundItems.length > 0 ? refundItems : undefined,
        }),
      });

      if (response.ok) {
        setStep('success');
        onSuccess?.();
      } else {
        const data = await response.json();
        setErrorMessage(data.error || t.errorDesc);
        setStep('error');
      }
    } catch (error) {
      console.error('Failed to submit refund request:', error);
      setErrorMessage(t.errorDesc);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setReason('');
    setOtherReason('');
    setRefundType('full');
    setSelectedItems(new Set(order.items?.map((_, idx) => idx) || []));
    onClose();
  };

  if (!isOpen) return null;

  const currencySymbol = (order as any).currency === 'USD' ? '$' : '¥';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div 
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900">{t.title}</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
            >
              x
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'form' && (
            <div className="space-y-5">
              {/* Order Info */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t.orderNumber}</span>
                  <span className="font-mono font-bold text-slate-700">#{order.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t.orderTotal}</span>
                  <span className="font-bold text-slate-700">{currencySymbol}{orderTotal.toFixed(2)}</span>
                </div>
                {refundedAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{t.refundableAmount}</span>
                    <span className="font-bold text-emerald-600">{currencySymbol}{refundableAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Refund Type */}
              {order.items && order.items.length > 1 && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t.selectItems}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRefundType('full');
                        setSelectedItems(new Set(order.items?.map((_, idx) => idx) || []));
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                        refundType === 'full'
                          ? 'bg-vs text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t.allItems}
                    </button>
                    <button
                      onClick={() => setRefundType('partial')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                        refundType === 'partial'
                          ? 'bg-vs text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t.partialItems}
                    </button>
                  </div>
                </div>
              )}

              {/* Item Selection (for partial refund) */}
              {refundType === 'partial' && order.items && (
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        selectedItems.has(idx)
                          ? 'border-vs bg-vs/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.has(idx)}
                        onChange={() => handleItemToggle(idx)}
                        className="w-5 h-5 rounded border-slate-300 text-vs focus:ring-vs"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">x{item.quantity || 1}</p>
                      </div>
                      <span className="font-bold text-slate-700">
                        {currencySymbol}{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Refund Amount Display */}
              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 font-medium">{t.refundAmount}</span>
                  <span className="text-2xl font-black text-emerald-600">
                    {currencySymbol}{refundAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t.refundReason}</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs bg-white"
                >
                  <option value="">{t.selectReason}</option>
                  <option value="quality">{t.reasonQuality}</option>
                  <option value="not_match">{t.reasonNotMatch}</option>
                  <option value="not_need">{t.reasonNotNeed}</option>
                  <option value="schedule">{t.reasonSchedule}</option>
                  <option value="other">{t.reasonOther}</option>
                </select>
              </div>

              {/* Other Reason Input */}
              {reason === 'other' && (
                <div>
                  <textarea
                    value={otherReason}
                    onChange={e => setOtherReason(e.target.value)}
                    placeholder={t.otherReasonPlaceholder}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs resize-none"
                  />
                </div>
              )}

              {/* Tips */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 mb-1">{t.tips}</p>
                <p className="text-xs text-amber-600">{t.tipContent}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !reason || refundAmount <= 0 || (reason === 'other' && !otherReason)}
                  className="flex-1 py-3 bg-vs text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t.submitting : t.submit}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.success}</h3>
              <p className="text-slate-500 text-sm mb-6">{t.successDesc}</p>
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-vs text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition"
              >
                OK
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.error}</h3>
              <p className="text-slate-500 text-sm mb-6">{errorMessage}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setStep('form')}
                  className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-3 bg-vs text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition"
                >
                  {t.submit}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundRequestModal;
export { RefundRequestModal };
