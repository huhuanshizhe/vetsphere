'use client';

import React, { useState } from 'react';
import { api } from '@vetsphere/shared/services/api';

interface AdminProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  specialty: string;
  group: string;
  imageUrl?: string;
  description?: string;
  stockQuantity: number;
  stockStatus: string;
  status: string;
  supplierId?: string;
  supplierName: string;
  supplierEmail: string;
  rejectionReason?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface ProductManagementTabProps {
  products: AdminProduct[];
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  Draft: { bg: 'bg-slate-500/20', text: 'text-slate-500', label: '草稿' },
  Pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '待审核' },
  Published: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '已上架' },
  Rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: '已拒绝' },
};

const STOCK_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'In Stock': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: '有库存' },
  'Low Stock': { bg: 'bg-amber-500/10', text: 'text-amber-400', label: '库存不足' },
  'Out of Stock': { bg: 'bg-red-500/10', text: 'text-red-400', label: '缺货' },
};

const GROUP_LABELS: Record<string, string> = {
  PowerTools: '电动工具', Implants: '植入物', HandInstruments: '手术器械', Consumables: '耗材', Equipment: '设备',
};

const ProductManagementTab: React.FC<ProductManagementTabProps> = ({ products, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailProduct, setDetailProduct] = useState<AdminProduct | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const filteredProducts = statusFilter === 'all'
    ? products
    : products.filter(p => p.status === statusFilter);

  const statusCounts = {
    all: products.length,
    Pending: products.filter(p => p.status === 'Pending').length,
    Published: products.filter(p => p.status === 'Published').length,
    Draft: products.filter(p => p.status === 'Draft').length,
    Rejected: products.filter(p => p.status === 'Rejected').length,
  };

  const handleApprove = async (productId: string) => {
    setProcessing(productId);
    try {
      const ok = await api.updateProductStatus(productId, 'Published');
      if (ok) onRefresh();
      else alert('操作失败，请重试');
    } catch {
      alert('操作失败');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setProcessing(rejectModal);
    try {
      const ok = await api.updateProductStatus(rejectModal, 'Rejected', rejectReason.trim());
      if (ok) {
        setRejectModal(null);
        setRejectReason('');
        onRefresh();
      } else {
        alert('操作失败，请重试');
      }
    } catch {
      alert('操作失败');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">商品管理</h1>
        <p className="text-sm text-slate-500 mt-1">审核供应商提交的商品，管理上架状态</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'all', label: '全部', count: statusCounts.all, color: 'text-slate-900' },
          { key: 'Pending', label: '待审核', count: statusCounts.Pending, color: 'text-amber-400' },
          { key: 'Published', label: '已上架', count: statusCounts.Published, color: 'text-emerald-400' },
          { key: 'Draft', label: '草稿', count: statusCounts.Draft, color: 'text-slate-500' },
          { key: 'Rejected', label: '已拒绝', count: statusCounts.Rejected, color: 'text-red-400' },
        ].map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`p-4 rounded-xl border transition-all text-left ${
              statusFilter === key
                ? 'bg-white/5 border-emerald-500/30'
                : 'bg-white/[0.02] border-white/5 hover:border-white/10'
            }`}
          >
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>{count}</p>
          </button>
        ))}
      </div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          {statusFilter === 'all' ? '暂无商品数据' : `没有${STATUS_CONFIG[statusFilter]?.label || ''}状态的商品`}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const status = STATUS_CONFIG[product.status] || STATUS_CONFIG.Draft;
            const stock = STOCK_CONFIG[product.stockStatus] || STOCK_CONFIG['In Stock'];
            const isProcessing = processing === product.id;

            return (
              <div
                key={product.id}
                className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Image */}
                  <div className="w-full sm:w-20 h-32 sm:h-20 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-slate-600">📦</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{product.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${stock.bg} ${stock.text}`}>
                        {stock.label} ({product.stockQuantity})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      {product.brand} · {GROUP_LABELS[product.group] || product.group} · ¥{product.price?.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-600">
                      供应商: {product.supplierName} ({product.supplierEmail})
                    </p>
                    {product.rejectionReason && product.status === 'Rejected' && (
                      <p className="text-xs text-red-400/80 mt-1">
                        拒绝原因: {product.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => setDetailProduct(product)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white/5 hover:bg-white/10 rounded-lg transition"
                    >
                      详情
                    </button>
                    {product.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(product.id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition disabled:opacity-50"
                        >
                          {isProcessing ? '...' : '通过'}
                        </button>
                        <button
                          onClick={() => { setRejectModal(product.id); setRejectReason(''); }}
                          disabled={isProcessing}
                          className="px-3 py-1.5 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition disabled:opacity-50"
                        >
                          拒绝
                        </button>
                      </>
                    )}
                    {product.status === 'Published' && (
                      <button
                        onClick={() => { setRejectModal(product.id); setRejectReason(''); }}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition disabled:opacity-50"
                      >
                        下架
                      </button>
                    )}
                    {product.status === 'Rejected' && (
                      <button
                        onClick={() => handleApprove(product.id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition disabled:opacity-50"
                      >
                        重新上架
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-200/50 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-900">商品详情</h2>
              <button
                onClick={() => setDetailProduct(null)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-slate-900"
              >
                x
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {detailProduct.imageUrl && (
                <img src={detailProduct.imageUrl} alt={detailProduct.name} className="w-full max-h-64 object-contain rounded-xl bg-white/5" />
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '名称', value: detailProduct.name },
                  { label: '品牌', value: detailProduct.brand },
                  { label: '价格', value: `¥${detailProduct.price?.toLocaleString()}` },
                  { label: '库存', value: `${detailProduct.stockQuantity} 件` },
                  { label: '分组', value: GROUP_LABELS[detailProduct.group] || detailProduct.group },
                  { label: '专科', value: detailProduct.specialty },
                  { label: '供应商', value: detailProduct.supplierName },
                  { label: '状态', value: STATUS_CONFIG[detailProduct.status]?.label || detailProduct.status },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {detailProduct.description && (
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">商品描述</p>
                  <p className="text-sm text-slate-600">{detailProduct.description}</p>
                </div>
              )}
              {detailProduct.rejectionReason && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">拒绝原因</p>
                  <p className="text-sm text-red-300">{detailProduct.rejectionReason}</p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-white/5 flex justify-end gap-2">
              {detailProduct.status === 'Pending' && (
                <>
                  <button
                    onClick={() => { handleApprove(detailProduct.id); setDetailProduct(null); }}
                    className="px-5 py-2 text-sm font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition"
                  >
                    通过上架
                  </button>
                  <button
                    onClick={() => { setDetailProduct(null); setRejectModal(detailProduct.id); setRejectReason(''); }}
                    className="px-5 py-2 text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition"
                  >
                    拒绝
                  </button>
                </>
              )}
              <button
                onClick={() => setDetailProduct(null)}
                className="px-5 py-2 text-sm font-bold text-slate-500 bg-white/5 hover:bg-white/10 rounded-xl transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-200/50 rounded-2xl max-w-md w-full">
            <div className="p-5 border-b border-white/5">
              <h3 className="text-lg font-black text-slate-900">拒绝商品 / 下架</h3>
              <p className="text-xs text-slate-500 mt-1">请输入拒绝或下架原因</p>
            </div>
            <div className="p-5">
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={4}
                placeholder="请说明原因..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-900 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/30 resize-none"
                autoFocus
              />
            </div>
            <div className="p-5 border-t border-white/5 flex justify-end gap-2">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing === rejectModal}
                className="px-5 py-2 text-sm font-bold text-slate-900 bg-red-500 hover:bg-red-400 rounded-xl transition disabled:opacity-50"
              >
                {processing === rejectModal ? '处理中...' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagementTab;
