'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { api } from '@vetsphere/shared/services/api';
import { useProductForm } from '@/hooks/useProductForm';
import CategorySelector from '@/components/CategorySelector';
import ImageUploader from '@/components/ImageUploader';
import StructuredSpecForm from '@/components/StructuredSpecForm';
import SkuVariantEditor from '@/components/SkuVariantEditor';
import RichTextEditor from '@/components/RichTextEditor';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Package,
  Image as ImageIcon,
  Truck,
  Settings,
  Layers,
  FileText,
  Eye,
  Save,
  Send,
  Loader2,
} from 'lucide-react';

interface ProductFormProps {
  initialData?: any;
  productId?: string;
}

const SECTIONS = [
  { id: 'basic', title: '基本信息', icon: Package },
  { id: 'images', title: '商品图片', icon: ImageIcon },
  { id: 'specs', title: '规格参数', icon: Settings },
  { id: 'variants', title: 'SKU管理', icon: Layers },
  { id: 'detail', title: '商品详情', icon: FileText },
  { id: 'preview', title: '预览提交', icon: Eye },
];

export default function ProductForm({ initialData, productId }: ProductFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);  // 新建模式不需要加载
  const [loadError, setLoadError] = useState('');
  const [editProductId, setEditProductId] = useState<string | null>(productId || null);
  
  // 根据商品状态判断是否只读（不区分大小写）
  const status = initialData?.status?.toLowerCase() || '';
  const isReadOnly = status === 'pending' || status === 'published';
  
  const {
    formData,
    setFormData,
    setName,
    setBrand,
    setPrice,
    setStockQuantity,
    setDescription,
    setRichDescription,
    setCategory,
    setImages,
    setSpecs,
    setHasVariants,
    setVariantAttributes,
    setSkus,
    // Trade & Logistics
    setDeliveryTime,
    setPackagingInfo,
    setWarrantyInfo,
    setMinOrderQuantity,
    setVideoUrl,
    setDimensions,
    setCertifications,
    // SEO
    setFaq,
    setMetaTitle,
    setMetaDescription,
    setFocusKeyword,
    completeness,
    isEdit,
    buildProduct,
    validate,
  } = useProductForm({ initialData });
  
  // 加载商品数据（编辑模式）
  useEffect(() => {
    if (productId && !initialData) {
      setLoading(true);  // 编辑模式需要加载
      loadProduct(productId);
    }
  }, [productId, initialData]);
  
  async function loadProduct(id: string) {
    setLoading(true);
    setLoadError('');
    try {
      const product = await api.getProductById(id);
      console.log('[ProductForm] Loaded product:', product);
      
      if (!product) {
        setLoadError('商品不存在或已被删除');
        return;
      }
      
      // 设置编辑模式的产品ID
      setEditProductId(id);
      
      // 将 API 返回的数据转换为表单需要的格式
      setFormData(prev => ({
        ...prev,
        name: product.name || '',
        brand: product.brand || '',
        price: product.price?.toString() || '',
        stockQuantity: product.stockQuantity?.toString() || '0',
        description: product.description || '',
        longDescription: product.longDescription || '',
        richDescription: product.richDescription || '',
        categoryId: product.category_id || null,
        subcategoryId: product.subcategory_id || null,
        level3CategoryId: (product as any).level3_category_id || null,
        images: product.images || [],
        specs: product.specs ? Object.entries(product.specs).map(([key, value]) => ({ key, value: String(value), isCustom: true })) : [],
        hasVariants: product.hasVariants || false,
        variantAttributes: product.variantAttributes || [],
        skus: product.skus || [],
        // Trade & Logistics
        deliveryTime: (product as any).delivery_time || '',
        packagingInfo: (product as any).packaging_info || '',
        warrantyInfo: (product as any).warranty_info || '',
        minOrderQuantity: (product as any).min_order_quantity?.toString() || '1',
        videoUrl: (product as any).video_url || '',
        dimensions: (product as any).dimensions || '',
        certifications: Array.isArray((product as any).certifications) 
          ? ((product as any).certifications as any[]).map(c => c.type || c).join(', ') 
          : '',
        // SEO
        faq: (product as any).faq || [],
        metaTitle: (product as any).metaTitle || '',
        metaDescription: (product as any).metaDescription || '',
        focusKeyword: (product as any).focusKeyword || '',
      }));
      
      console.log('[ProductForm] Set formData:', {
        hasVariants: product.hasVariants,
        variantAttributesLen: product.variantAttributes?.length || 0,
        skusLen: product.skus?.length || 0,
        variantAttributes: product.variantAttributes,
        skus: product.skus
      });
    } catch (err) {
      console.error('加载商品数据失败:', err);
      setLoadError('加载失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  }

  const [activeSection, setActiveSection] = useState('basic');
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 判断是否处于编辑模式
  const isEditMode = !!editProductId;

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle submit
  const handleSubmit = async (asDraft: boolean) => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const product = buildProduct();
      // 如果是编辑模式，确保包含产品ID
      if (isEditMode && editProductId) {
        product.id = editProductId;
      }
      const status = asDraft ? 'Draft' as const : 'Pending' as const;
      const payload = {
        ...product,
        status,
        supplierId: user!.id,
      };

      await api.manageProduct(isEditMode ? 'update' : 'create', payload);
      router.push('/dashboard?tab=库存管理');
    } catch (e: any) {
      setError(e?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle save draft
  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      console.log('[ProductForm] handleSaveDraft - Current formData state:', {
        hasVariants: formData.hasVariants,
        variantAttributesLen: formData.variantAttributes?.length,
        skusLen: formData.skus?.length,
        specsLen: formData.specs?.length,
        specs: formData.specs
      });
      
      const product = buildProduct();
      
      console.log('[ProductForm] handleSaveDraft - FULL product data:', JSON.stringify(product, null, 2));
      console.log('[ProductForm] handleSaveDraft - formData:', JSON.stringify(formData, null, 2));
      
      // 如果是编辑模式，确保包含产品ID
      if (isEditMode && editProductId) {
        product.id = editProductId;
      }
      const payload = {
        ...product,
        status: 'Draft' as const,
        supplierId: user!.id,
      };

      console.log('[ProductForm] handleSaveDraft - payload:', JSON.stringify(payload, null, 2));
      
      const result = await api.manageProduct(isEditMode ? 'update' : 'create', payload);
      
      console.log('[ProductForm] handleSaveDraft - save complete, result:', result);
      
      // 如果是新建模式，保存成功后切换到编辑模式
      if (!isEditMode && result) {
        // 使用 API 返回的产品 ID
        setEditProductId(result);
      }
      
      setSuccessMsg('草稿保存成功！');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    router.push('/dashboard?tab=库存管理');
  };

  // Get section completion status
  const getSectionStatus = (sectionId: string): 'complete' | 'partial' | 'empty' => {
    switch (sectionId) {
      case 'basic':
        if (formData.name && formData.brand && formData.categoryId && formData.price) return 'complete';
        if (formData.name || formData.brand) return 'partial';
        return 'empty';
      case 'images':
        if (formData.images.some(i => i.type === 'main') && formData.images.filter(i => i.type === 'detail').length >= 3) return 'complete';
        if (formData.images.length > 0) return 'partial';
        return 'empty';
      case 'specs':
        if (formData.specs.length >= 3) return 'complete';
        if (formData.specs.length > 0) return 'partial';
        return 'empty';
      case 'variants':
        if (!formData.hasVariants) return 'complete';
        if (formData.skus.length > 0) return 'complete';
        return 'partial';
      case 'detail':
        if (formData.description.length >= 50 && formData.richDescription) return 'complete';
        if (formData.description || formData.richDescription) return 'partial';
        return 'empty';
      default:
        return 'empty';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 保存中覆盖层 */}
      {(saving || submitting) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="text-lg font-medium text-gray-900">
              {saving ? '正在保存草稿...' : '正在提交审核...'}
            </p>
            <p className="text-sm text-gray-500">请稍候，不要关闭页面</p>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      ) : loadError ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-600 font-medium mb-2">{loadError}</p>
            <button onClick={() => router.back()} className="btn btn-secondary">
              返回
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 只读模式提示 */}
          {isReadOnly && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">
                  {initialData?.status === 'Pending' 
                    ? '商品正在审核中，暂时无法编辑' 
                    : '商品已审核通过，如需修改请联系管理员'}
                </span>
              </div>
            </div>
          )}
          
          {/* 成功消息 - 固定定位Toast */}
          {successMsg && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-50 border border-green-200 rounded-lg shadow-lg px-6 py-3 animate-slide-down">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{successMsg}</span>
              </div>
            </div>
          )}

          {/* 错误消息 - 固定定位Toast */}
          {error && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg shadow-lg px-6 py-3 animate-slide-down">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">返回</span>
                </button>
                <h1 className="text-lg font-semibold text-gray-900">
                  {isEditMode ? '编辑商品' : '添加新商品'}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || submitting || isReadOnly}
                  className="btn btn-secondary inline-flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  保存草稿
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting || saving || isReadOnly}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  提交审核
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6">
            {/* Left Navigation */}
            <div className="hidden lg:block w-56 flex-shrink-0">
              <div className="sticky top-24 bg-white rounded-xl border border-gray-200 p-4">
                <nav className="space-y-1">
                  {SECTIONS.map(section => {
                    const Icon = section.icon;
                    const status = getSectionStatus(section.id);
                    const isActive = activeSection === section.id;

                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="flex-1 text-sm font-medium">{section.title}</span>
                        {status === 'complete' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        {status === 'partial' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      </button>
                    );
                  })}
                </nav>

                {/* Completeness */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">完成度</span>
                    <span className={`text-sm font-semibold ${
                      completeness >= 80 ? 'text-emerald-600' : completeness >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {completeness}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        completeness >= 80 ? 'bg-emerald-500' : completeness >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-6">
              {/* Section 1: Basic Info */}
              <section id="basic" className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  基本信息
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      商品名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={formData.name}
                      onChange={e => setName(e.target.value)}
                      placeholder="如: TPLO 高扭矩锯"
                      className="input"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      品牌 <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={formData.brand}
                      onChange={e => setBrand(e.target.value)}
                      placeholder="如: Synthes"
                      className="input"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    商品分类 <span className="text-red-500">*</span>
                  </label>
                  <CategorySelector
                    value={{
                      level1: formData.categoryId,
                      level2: formData.subcategoryId,
                      level3: formData.level3CategoryId,
                    }}
                    onChange={setCategory}
                    required
                    disabled={isReadOnly}
                  />
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>提示：</strong> 商品的价格、库存、重量等信息请在下方"SKU 管理"区域设置。
                  </p>
                </div>
              </section>

              {/* Section 2: Images */}
              <section id="images" className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  商品图片
                </h2>
                <ImageUploader
                  images={formData.images}
                  onChange={setImages}
                  maxImages={12}
                  mainImageRequired={false}
                  disabled={isReadOnly}
                />
              </section>

              {/* Section 3: Specs (Parameters) */}
              <section id="specs" className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  规格参数
                  <span className="text-sm font-normal text-gray-500">（产品性能属性）</span>
                </h2>
                <StructuredSpecForm
                  productGroup={formData.categoryName as any}
                  categoryId={formData.categoryId}
                  subcategoryId={formData.subcategoryId}
                  level3CategoryId={formData.level3CategoryId}
                  value={formData.specs}
                  onChange={setSpecs}
                  disabled={isReadOnly}
                />
              </section>

              {/* Section 4: SKU Variants */}
              <section id="variants" className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  SKU规格管理
                  <span className="text-sm font-normal text-gray-500">（下单时选择的规格，如颜色、尺寸）</span>
                </h2>

                <SkuVariantEditor
                  hasVariants={formData.hasVariants}
                  onHasVariantsChange={setHasVariants}
                  variantAttributes={formData.variantAttributes}
                  onVariantAttributesChange={setVariantAttributes}
                  skus={formData.skus}
                  onSkusChange={setSkus}
                  basePrice={parseFloat(formData.price) || 0}
                  disabled={isReadOnly}
                />
              </section>

              {/* Section 4.5: Trade & Logistics */}
              <section id="logistics" className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  贸易与物流
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      发货时间
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryTime}
                      onChange={e => setDeliveryTime(e.target.value)}
                      placeholder="如：3-5个工作日"
                      className="input"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      最小起订量
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.minOrderQuantity}
                      onChange={e => setMinOrderQuantity(e.target.value)}
                      placeholder="1"
                      className="input"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      包装信息
                    </label>
                    <input
                      type="text"
                      value={formData.packagingInfo}
                      onChange={e => setPackagingInfo(e.target.value)}
                      placeholder="如：纸箱包装，每箱10件"
                      className="input"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      保修信息
                    </label>
                    <input
                      type="text"
                      value={formData.warrantyInfo}
                      onChange={e => setWarrantyInfo(e.target.value)}
                      placeholder="如：整机保修1年"
                      className="input"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      产品尺寸
                    </label>
                    <input
                      type="text"
                      value={formData.dimensions}
                      onChange={e => setDimensions(e.target.value)}
                      placeholder="如：30x20x15 cm"
                      className="input"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      产品认证
                    </label>
                    <input
                      type="text"
                      value={formData.certifications}
                      onChange={e => setCertifications(e.target.value)}
                      placeholder="如：CE, FDA, ISO13485（逗号分隔）"
                      className="input"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      产品视频链接
                    </label>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                      placeholder="如：https://www.youtube.com/watch?v=xxx"
                      className="input"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </section>

              {/* Section 5: Detail */}
              <section id="detail" className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  商品详情
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      商品简介 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      placeholder="简要描述商品特点，建议50字以上..."
                      className="input resize-none"
                      disabled={isReadOnly}
                    />
                    <p className="text-xs text-gray-500 mt-1">已输入 {formData.description.trim().length} 字</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      富文本详情
                    </label>
                    <RichTextEditor
                      value={formData.richDescription}
                      onChange={setRichDescription}
                      placeholder="输入商品详情，支持图文混排、表格、视频..."
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </section>

              {/* Section 6: Preview */}
              <section id="preview" className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  预览确认
                </h2>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">商品名称</p>
                    <p className="font-medium text-gray-900 truncate">{formData.name || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">品牌</p>
                    <p className="font-medium text-gray-900">{formData.brand || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">
                      价格 {!formData.hasVariants && <span className="text-red-500">*</span>}
                    </p>
                    {formData.hasVariants ? (
                      <p className="font-medium text-gray-900">
                        {formData.skus.length > 0
                          ? `¥${Math.min(...formData.skus.map(s => s.price)).toLocaleString()} - ¥${Math.max(...formData.skus.map(s => s.price)).toLocaleString()}`
                          : '未设置'}
                      </p>
                    ) : (
                      <p className="font-medium text-gray-900">¥{parseFloat(formData.price || '0').toLocaleString()}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">
                      库存 {!formData.hasVariants && <span className="text-red-500">*</span>}
                    </p>
                    {formData.hasVariants ? (
                      <p className="font-medium text-gray-900">
                        {formData.skus.length > 0
                          ? `${formData.skus.reduce((sum, sku) => sum + sku.stockQuantity, 0)} 件`
                          : '未设置'}
                      </p>
                    ) : (
                      <p className="font-medium text-gray-900">{formData.stockQuantity} 件</p>
                    )}
                  </div>
                </div>

                {/* Images Preview */}
                {formData.images.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">商品图片 ({formData.images.length}张)</p>
                    <div className="flex gap-2 flex-wrap">
                      {formData.images.map((img, i) => (
                        <img
                          key={img.id || i}
                          src={img.url}
                          alt="预览"
                          className={`w-16 h-16 object-cover rounded-lg ${img.type === 'main' ? 'ring-2 ring-blue-500' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
