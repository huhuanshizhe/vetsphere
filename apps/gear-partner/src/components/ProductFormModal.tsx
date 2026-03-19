'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Product } from '@vetsphere/shared/types';
import ImageUploader, { ProductImage } from './ImageUploader';
import StructuredSpecForm, { SpecValue } from './StructuredSpecForm';
import CategorySelector from './CategorySelector';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Package,
  Image,
  Settings,
  Eye,
} from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  initialData?: Product | null;
  onClose: () => void;
  onSubmit: (product: Partial<Product>, asDraft: boolean) => Promise<void>;
}

interface CheckResult {
  field: string;
  status: 'pass' | 'warning' | 'error';
  message: string;
}

export default function ProductFormModal({ isOpen, initialData, onClose, onSubmit }: ProductFormModalProps) {
  const STEPS = [
    { id: 0, title: '基本信息', description: '商品基础信息', icon: Package },
    { id: 1, title: '商品图片', description: '上传商品图片', icon: Image },
    { id: 2, title: '规格参数', description: '填写规格参数', icon: Settings },
    { id: 3, title: '预览确认', description: '检查并提交', icon: Eye },
  ];

  const isEdit = !!initialData;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [stockQuantity, setStockQuantity] = useState(initialData?.stockQuantity?.toString() || '0');
  const [description, setDescription] = useState(initialData?.description || '');
  const [longDescription, setLongDescription] = useState(initialData?.longDescription || '');

  // Category state (new three-level cascade selector)
  const [category, setCategory] = useState<{
    level1: string | null;
    level2: string | null;
    level3: string | null;
    level1Name?: string;
    level2Name?: string;
    level3Name?: string;
  }>({
    level1: initialData?.category_id || null,
    level2: initialData?.subcategory_id || null,
    level3: null,
    level1Name: undefined,
    level2Name: undefined,
    level3Name: undefined,
  });

  // Multi-image support
  const [images, setImages] = useState<ProductImage[]>(() => {
    if (initialData?.imageUrl) {
      return [{ id: 'img-main', url: initialData.imageUrl, type: 'main', sortOrder: 0 }];
    }
    return [];
  });

  const [specs, setSpecs] = useState<SpecValue[]>(() => {
    if (initialData?.specs && Object.keys(initialData.specs).length > 0) {
      return Object.entries(initialData.specs).map(([key, value]) => ({ key, value }));
    }
    return [];
  });

  // Specs validation state
  const [specsValidation, setSpecsValidation] = useState<{ isValid: boolean; missingRequired: string[] }>({
    isValid: true,
    missingRequired: [],
  });

  // Calculate completeness
  const completeness = useMemo(() => {
    let score = 0;
    const weights = {
      name: 15,
      brand: 10,
      category: 20,
      price: 15,
      stockQuantity: 5,
      description: 15,
      mainImage: 10,
      detailImages: 5,
      specs: 5,
    };

    if (name.trim()) score += weights.name;
    if (brand.trim()) score += weights.brand;
    if (category.level1) score += 8;
    if (category.level2) score += 8;
    if (category.level3) score += 4;
    if (price && parseFloat(price) > 0) score += weights.price;
    if (stockQuantity !== '') score += weights.stockQuantity;
    if (description.trim()) score += weights.description;
    if (images.some(img => img.type === 'main')) score += weights.mainImage;
    if (images.filter(img => img.type === 'detail').length >= 2) score += weights.detailImages;
    if (specs.some(s => s.key.trim() && s.value.trim())) score += weights.specs;

    return Math.min(score, 100);
  }, [name, brand, category, price, stockQuantity, description, images, specs]);

  // Auto check results
  const autoCheckResults = useMemo((): CheckResult[] => {
    const results: CheckResult[] = [];

    // Name check
    if (name.trim().length >= 10) {
      results.push({ field: '商品名称', status: 'pass', message: '长度合适' });
    } else if (name.trim().length > 0) {
      results.push({ field: '商品名称', status: 'warning', message: '建议10-30字' });
    } else {
      results.push({ field: '商品名称', status: 'error', message: '必填项' });
    }

    // Category check
    if (category.level2) {
      results.push({ field: '商品分类', status: 'pass', message: '已选择分类' });
    } else if (category.level1) {
      results.push({ field: '商品分类', status: 'warning', message: '请选择二级分类' });
    } else {
      results.push({ field: '商品分类', status: 'error', message: '必填项' });
    }

    // Main image check
    if (images.some(img => img.type === 'main')) {
      results.push({ field: '主图', status: 'pass', message: '已上传' });
    } else {
      results.push({ field: '主图', status: 'error', message: '请上传主图' });
    }

    // Description check
    if (description.trim().length >= 50) {
      results.push({ field: '商品简介', status: 'pass', message: '内容丰富' });
    } else if (description.trim().length >= 20) {
      results.push({ field: '商品简介', status: 'warning', message: `建议≥50字，当前${description.trim().length}字` });
    } else {
      results.push({ field: '商品简介', status: 'error', message: '必填项' });
    }

    // Price check
    if (parseFloat(price) > 0) {
      results.push({ field: '价格', status: 'pass', message: '已设置' });
    } else {
      results.push({ field: '价格', status: 'error', message: '必填项' });
    }

    // Stock check
    if (parseInt(stockQuantity) > 10) {
      results.push({ field: '库存', status: 'pass', message: '库存充足' });
    } else if (parseInt(stockQuantity) > 0) {
      results.push({ field: '库存', status: 'warning', message: '库存较低' });
    } else {
      results.push({ field: '库存', status: 'pass', message: '可接受' });
    }

    // Detail images check
    const detailCount = images.filter(img => img.type === 'detail').length;
    if (detailCount >= 3) {
      results.push({ field: '详情图', status: 'pass', message: `${detailCount}张` });
    } else if (detailCount > 0) {
      results.push({ field: '详情图', status: 'warning', message: `建议3张以上，当前${detailCount}张` });
    } else {
      results.push({ field: '详情图', status: 'warning', message: '建议添加详情图' });
    }

    // Specs check
    const validSpecs = specs.filter(s => s.key.trim() && s.value.trim()).length;
    if (validSpecs >= 3) {
      results.push({ field: '规格参数', status: 'pass', message: `${validSpecs}项参数` });
    } else if (validSpecs > 0) {
      results.push({ field: '规格参数', status: 'warning', message: '建议添加更多参数' });
    } else {
      results.push({ field: '规格参数', status: 'warning', message: '建议添加参数' });
    }

    return results;
  }, [name, category, images, description, price, stockQuantity, specs]);

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!name.trim()) return '请输入商品名称';
      if (!brand.trim()) return '请输入品牌';
      if (!category.level1) return '请选择一级分类';
      if (!category.level2) return '请选择二级分类';
      if (!price || parseFloat(price) <= 0) return '请输入有效价格';
      if (stockQuantity === '' || parseInt(stockQuantity) < 0) return '库存数量不能为负';
    }
    if (s === 2) {
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

  const buildProduct = (): Partial<Product> => {
    const specsObj: Record<string, string> = {};
    specs.forEach(s => { if (s.key.trim() && s.value.trim()) specsObj[s.key.trim()] = s.value.trim(); });

    // Get main image URL for backward compatibility
    const mainImage = images.find(img => img.type === 'main');

    return {
      ...(initialData?.id ? { id: initialData.id } : {}),
      name: name.trim(),
      brand: brand.trim(),
      category_id: category.level1 || undefined,
      subcategory_id: category.level2 || undefined,
      price: parseFloat(price),
      stockQuantity: parseInt(stockQuantity),
      description: description.trim(),
      longDescription: longDescription.trim(),
      imageUrl: mainImage?.url || '',
      specs: specsObj,
      stockStatus: parseInt(stockQuantity) === 0 ? 'Out of Stock' : parseInt(stockQuantity) < 10 ? 'Low Stock' : 'In Stock',
      images: images.map(img => ({ url: img.url, type: img.type, sortOrder: img.sortOrder })),
    };
  };

  const handleSubmit = async (asDraft: boolean) => {
    const err = validateStep(0) || validateStep(2);
    if (err) { setError(err); return; }

    // For non-draft submission, check for errors
    if (!asDraft) {
      const hasErrors = autoCheckResults.some(r => r.status === 'error');
      if (hasErrors) {
        setError('请修复所有错误后再提交审核');
        return;
      }
    }

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

  // Build category path for display
  const categoryPath = [
    category.level1Name,
    category.level2Name,
    category.level3Name,
  ].filter(Boolean).join(' → ');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideUp">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? '编辑商品' : '添加商品'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{STEPS[step].description}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isCompleted = i < step;
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-sm font-medium hidden sm:block ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      {s.title}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < step ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Completeness Bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  completeness >= 80 ? 'bg-emerald-500' : completeness >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${
              completeness >= 80 ? 'text-emerald-600' : completeness >= 50 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {completeness}%
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            {step === 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      商品名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="如: TPLO 高扭矩锯"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      品牌 <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                      placeholder="如: Synthes"
                      className="input"
                    />
                  </div>
                </div>

                {/* Category Selector - New Cascade Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    商品分类 <span className="text-red-500">*</span>
                  </label>
                  <CategorySelector
                    value={{
                      level1: category.level1,
                      level2: category.level2,
                      level3: category.level3,
                    }}
                    onChange={setCategory}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      价格 (¥) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      库存数量
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stockQuantity}
                      onChange={e => setStockQuantity(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  商品图片
                </label>
                <ImageUploader
                  images={images}
                  onChange={setImages}
                  maxImages={12}
                  mainImageRequired={false}
                />
              </div>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    商品简介 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="简要描述商品特点，建议50字以上..."
                    className="input resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">已输入 {description.trim().length} 字</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    详细描述
                  </label>
                  <textarea
                    value={longDescription}
                    onChange={e => setLongDescription(e.target.value)}
                    rows={5}
                    placeholder="详细的产品介绍、使用方法、适应症等..."
                    className="input resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    规格参数
                  </label>
                  <StructuredSpecForm
                    productGroup={category.level1Name as any}
                    value={specs}
                    onChange={setSpecs}
                    onValidationChange={(isValid, missingRequired) => {
                      setSpecsValidation({ isValid, missingRequired });
                    }}
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <div className="space-y-5">
                {/* Auto Check Results */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">发布前检查</h3>
                    <span className={`text-lg font-bold ${
                      completeness >= 80 ? 'text-emerald-600' : completeness >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {completeness}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    {autoCheckResults.map((result, i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        {result.status === 'pass' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        {result.status === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                        {result.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        <span className="text-sm text-gray-500 w-20">{result.field}</span>
                        <span className={`text-sm ${
                          result.status === 'pass' ? 'text-gray-700' :
                          result.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {result.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <h3 className="font-semibold text-gray-900">商品信息预览</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">名称</p>
                    <p className="font-medium text-gray-900">{name || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">品牌</p>
                    <p className="font-medium text-gray-900">{brand || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                    <p className="text-xs text-gray-500 mb-1">商品分类</p>
                    <p className="font-medium text-gray-900">{categoryPath || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">价格</p>
                    <p className="font-medium text-gray-900">¥{parseFloat(price || '0').toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">库存</p>
                    <p className="font-medium text-gray-900">{stockQuantity} 件</p>
                  </div>
                </div>

                {/* Images Preview */}
                {images.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2">商品图片 ({images.length}张)</p>
                    <div className="flex gap-2 flex-wrap">
                      {images.map(img => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt="预览"
                          className={`w-16 h-16 object-cover rounded-lg ${img.type === 'main' ? 'ring-2 ring-blue-500' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">商品描述</p>
                  <p className="text-sm text-gray-700">{description || '-'}</p>
                </div>

                {Object.entries(buildProduct().specs || {}).length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2">规格参数</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(buildProduct().specs || {}).map(([k, v]) => (
                        <div key={k} className="text-sm">
                          <span className="text-gray-500">{k}:</span>{' '}
                          <span className="text-gray-900">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div>
            {step > 0 && (
              <button
                onClick={handleBack}
                disabled={submitting}
                className="btn btn-secondary inline-flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="btn btn-secondary"
                >
                  {submitting ? '保存中...' : '保存草稿'}
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="btn btn-primary"
                >
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
