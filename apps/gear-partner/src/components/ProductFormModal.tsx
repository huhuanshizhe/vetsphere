'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Product } from '@vetsphere/shared/types';
import { useSiteConfig } from '@vetsphere/shared/context/SiteConfigContext';

interface ProductFormModalProps {
  isOpen: boolean;
  initialData?: Product | null;
  onClose: () => void;
  onSubmit: (product: Partial<Product>, asDraft: boolean) => Promise<void>;
}

export default function ProductFormModal({ isOpen, initialData, onClose, onSubmit }: ProductFormModalProps) {
  const { siteConfig } = useSiteConfig();

  // Read categories from config
  const groupDimension = useMemo(() =>
    siteConfig.shopCategories?.dimensions.find(d => d.key === 'group'),
    [siteConfig.shopCategories]
  );
  const specialtyDimension = useMemo(() =>
    siteConfig.shopCategories?.dimensions.find(d => d.key === 'specialty'),
    [siteConfig.shopCategories]
  );
  const groups = useMemo(() => groupDimension?.categories ?? [], [groupDimension]);
  const specialties = useMemo(() => specialtyDimension?.categories ?? [], [specialtyDimension]);
  const getLabel = (cat: { key: string; labels: Record<string, string> }) =>
    cat.labels['zh'] || cat.labels['en'] || Object.values(cat.labels)[0] || cat.key;

  const STEPS = [
    { id: 0, title: '基本信息', icon: '📋' },
    { id: 1, title: '详细信息', icon: '📝' },
    { id: 2, title: '预览确认', icon: '✅' },
  ];

  const isEdit = !!initialData;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [specialty, setSpecialty] = useState<string>(initialData?.specialty || '');
  const [group, setGroup] = useState<string>(initialData?.group || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [stockQuantity, setStockQuantity] = useState(initialData?.stockQuantity?.toString() || '0');
  const [description, setDescription] = useState(initialData?.description || '');
  const [longDescription, setLongDescription] = useState(initialData?.longDescription || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(() => {
    if (initialData?.specs && Object.keys(initialData.specs).length > 0) {
      return Object.entries(initialData.specs).map(([key, value]) => ({ key, value }));
    }
    return [{ key: '', value: '' }];
  });

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!name.trim()) return '请输入商品名称';
      if (!brand.trim()) return '请输入品牌';
      if (!specialty) return '请选择专科';
      if (!group) return '请选择分组';
      if (!price || parseFloat(price) <= 0) return '请输入有效价格';
      if (stockQuantity === '' || parseInt(stockQuantity) < 0) return '库存数量不能为负';
    }
    if (s === 1) {
      if (!description.trim()) return '请输入商品描述';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'product');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) setImageUrl(data.url);
      else setError(data.error || '上传失败');
    } catch {
      setError('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const addSpec = () => setSpecs([...specs, { key: '', value: '' }]);
  const removeSpec = (i: number) => setSpecs(specs.filter((_, idx) => idx !== i));
  const updateSpec = (i: number, field: 'key' | 'value', val: string) => {
    const updated = [...specs];
    updated[i][field] = val;
    setSpecs(updated);
  };

  const buildProduct = (): Partial<Product> => {
    const specsObj: Record<string, string> = {};
    specs.forEach(s => { if (s.key.trim() && s.value.trim()) specsObj[s.key.trim()] = s.value.trim(); });
    return {
      ...(initialData?.id ? { id: initialData.id } : {}),
      name: name.trim(), brand: brand.trim(),
      specialty: specialty as any, group: group as any,
      price: parseFloat(price), stockQuantity: parseInt(stockQuantity),
      description: description.trim(), longDescription: longDescription.trim(),
      imageUrl, specs: specsObj,
      stockStatus: parseInt(stockQuantity) === 0 ? 'Out of Stock' : parseInt(stockQuantity) < 10 ? 'Low Stock' : 'In Stock',
    };
  };

  const handleSubmit = async (asDraft: boolean) => {
    const err = validateStep(0) || validateStep(1);
    if (err) { setError(err); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(buildProduct(), asDraft);
    } catch (e: any) {
      setError(e?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = useCallback(() => {
    if (name || description) {
      if (!window.confirm('有未保存的内容，确定关闭吗？')) return;
    }
    onClose();
  }, [name, description, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0F172A] border border-blue-500/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-blue-500/10 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">{isEdit ? '编辑商品' : '添加商品'}</h2>
            <p className="text-xs text-gray-500 mt-1">步骤 {step + 1} / {STEPS.length} · {STEPS[step].icon} {STEPS[step].title}</p>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-gray-400 hover:bg-blue-500/20 hover:text-white">x</button>
        </div>

        {/* Progress */}
        <div className="px-5 pt-3">
          <div className="h-1.5 bg-blue-500/10 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {step === 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1.5">商品名称 *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="如: TPLO 高扭矩锯" className="w-full px-3 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1.5">品牌 *</label>
                  <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="如: Synthes" className="w-full px-3 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1.5">专科方向 *</label>
                  <select value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full px-3 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/40">
                    <option value="">选择专科</option>
                    {specialties.map(s => <option key={s.key} value={s.key}>{getLabel(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1.5">商品分组 *</label>
                  <select value={group} onChange={e => setGroup(e.target.value)} className="w-full px-3 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/40">
                    <option value="">选择分组</option>
                    {groups.map(g => <option key={g.key} value={g.key}>{getLabel(g)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1.5">价格 (¥) *</label>
                  <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full px-3 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1.5">库存数量</label>
                  <input type="number" min="0" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} className="w-full px-3 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/40" />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1.5">商品简介 *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="简要描述商品特点..." className="w-full px-3 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1.5">详细描述</label>
                <textarea value={longDescription} onChange={e => setLongDescription(e.target.value)} rows={5} placeholder="详细的产品介绍、使用方法、适应症等..." className="w-full px-3 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 resize-none" />
              </div>
              {/* Image upload */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1.5">商品图片</label>
                {imageUrl ? (
                  <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-blue-500/20">
                    <img src={imageUrl} alt="预览" className="w-full h-full object-cover" />
                    <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-500">x</button>
                  </div>
                ) : (
                  <label className="block w-48 h-48 border-2 border-dashed border-blue-500/20 rounded-xl cursor-pointer hover:border-blue-500/40 transition flex flex-col items-center justify-center text-gray-500">
                    {uploading ? <span className="animate-pulse text-blue-400">上传中...</span> : <><span className="text-3xl mb-2">📷</span><span className="text-xs">点击上传</span></>}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>
              {/* Specs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-300">规格参数</label>
                  <button onClick={addSpec} className="text-xs text-blue-400 hover:text-blue-300">+ 添加</button>
                </div>
                <div className="space-y-2">
                  {specs.map((spec, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={spec.key} onChange={e => updateSpec(i, 'key', e.target.value)} placeholder="参数名" className="flex-1 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40" />
                      <input value={spec.value} onChange={e => updateSpec(i, 'value', e.target.value)} placeholder="参数值" className="flex-1 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40" />
                      {specs.length > 1 && (
                        <button onClick={() => removeSpec(i)} className="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-white font-bold">确认商品信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">名称</p>
                  <p className="text-white font-bold">{name}</p>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">品牌</p>
                  <p className="text-white font-bold">{brand}</p>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">专科 / 分组</p>
                  <p className="text-white font-bold">{specialties.find(s => s.key === specialty)?.labels['zh'] || specialty} · {groups.find(g => g.key === group)?.labels['zh'] || group}</p>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">价格 / 库存</p>
                  <p className="text-white font-bold">¥{parseFloat(price || '0').toLocaleString()} · {stockQuantity} 件</p>
                </div>
              </div>
              {imageUrl && (
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">商品图片</p>
                  <img src={imageUrl} alt="预览" className="w-32 h-32 object-cover rounded-lg" />
                </div>
              )}
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">商品描述</p>
                <p className="text-gray-300 text-sm">{description}</p>
              </div>
              {Object.entries(buildProduct().specs || {}).length > 0 && (
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">规格参数</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(buildProduct().specs || {}).map(([k, v]) => (
                      <div key={k} className="text-sm"><span className="text-gray-500">{k}:</span> <span className="text-white">{v}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-sm font-bold">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-blue-500/10 flex justify-between items-center">
          <div>
            {step > 0 && (
              <button onClick={handleBack} disabled={submitting} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition">
                上一步
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {step < 2 ? (
              <button onClick={handleNext} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-sm font-bold transition">
                下一步
              </button>
            ) : (
              <>
                <button onClick={() => handleSubmit(true)} disabled={submitting} className="px-5 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-sm font-bold border border-blue-500/30 transition disabled:opacity-50">
                  {submitting ? '...' : '保存草稿'}
                </button>
                <button onClick={() => handleSubmit(false)} disabled={submitting} className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-sm font-bold transition disabled:opacity-50">
                  {submitting ? '提交中...' : '提交审核'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
