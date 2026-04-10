'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, LoadingState, ConfirmDialog, Toast, ToastContainer, useToast } from '@/components/ui';
import RichTextEditor from '@/components/RichTextEditor';
import { ChevronRight, ChevronUp, Upload, X, Settings2, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';

type Lang = 'en' | 'zh' | 'th' | 'ja';

// SKU规格参数预设
const SKU_SPEC_PRESETS = [
  '功率', '电压', '尺寸', '材质', '容量', '精度', '速度', '频率', '温度范围', '压力范围',
  '尺寸(mm)', '重量', '颜色', '型号', '规格', '包装', '认证'
];

export default function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  // 数据状态
  const [product, setProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 编辑状态
  const [editLang, setEditLang] = useState<Lang>('zh');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // AI 翻译状态
  const [translating, setTranslating] = useState(false);
  const [translateSuccess, setTranslateSuccess] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  // 翻译进度状态
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [translateStep, setTranslateStep] = useState(0);
  const [translateProgress, setTranslateProgress] = useState(0);

  // UI 状态
  const [activeTab, setActiveTab] = useState('basic');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedSites, setSelectedSites] = useState<string[]>(['cn']);
  const [publishing, setPublishing] = useState(false);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);

  // Toast 通知
  const { toasts, addToast, removeToast, success, error: toastError, warning } = useToast();

  // 分类和 SKU 状态
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [variantAttributes, setVariantAttributes] = useState<any[]>([]);
  const [productSkus, setProductSkus] = useState<any[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // SKU展开状态
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());

  // 阶梯价格状态
  const [priceTiers, setPriceTiers] = useState<Record<string, any[]>>({});
  const [loadingTiers, setLoadingTiers] = useState<Record<string, boolean>>({});

  // Admin 可以编辑所有状态的产品
  const isReadOnly = false;

  // 是否为新建模式
  const isNewProduct = productId === 'new';

  // 加载产品数据
  useEffect(() => {
    if (isNewProduct) {
      // 新建模式：初始化空表单
      const emptyProduct = {
        id: 'new',
        name: '',
        name_en: '',
        name_zh: '',
        brand: '',
        description: '',
        description_en: '',
        rich_description: '',
        rich_description_en: '',
        category_id: '',
        status: 'draft',
        has_price: true,
        min_order_quantity: 1,
        weight: 0,
        specifications: {},
        faq: [],
        variant_attributes: [],
        skus: [],
        images: [],
        site_views: [],
      };
      setProduct(emptyProduct);
      setEditForm({ ...emptyProduct });
      loadCategories();
      setLoading(false);
    } else {
      loadProduct();
    }
  }, [productId]);

  async function loadProduct() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}?view=base`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('产品不存在');
        throw new Error('加载失败');
      }
      const json = await res.json();
      const data = json.data;
      setProduct(data);
      setEditForm({ ...data });

      // 加载分类数据
      await loadCategories();

      // 加载 SKU 变体数据
      await loadVariantData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
      console.log('[ProductEdit] Loaded categories:', data?.length);
    } catch (err) {
      console.error('[ProductEdit] Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  }

  async function loadVariantData() {
    setLoadingVariants(true);
    try {
      // 如果 API 已经返回了数据，直接使用
      if (product?.skus && product?.skus.length > 0) {
        setProductSkus(product.skus);
        console.log('[ProductEdit] Using SKUs from API response:', product.skus.length);

        // 同时加载规格属性（如果 API 没有返回）
        if (!product.variant_attributes || product.variant_attributes.length === 0) {
          const { data: attrs, error: attrsError } = await supabase
            .from('product_variant_attributes')
            .select('*')
            .eq('product_id', productId)
            .order('sort_order');

          if (attrsError) throw attrsError;
          setVariantAttributes(attrs || []);
        } else {
          setVariantAttributes(product.variant_attributes);
        }
        setLoadingVariants(false);
        return;
      }

      // 如果 API 没有返回数据，单独查询
      const { data: attrs, error: attrsError } = await supabase
        .from('product_variant_attributes')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');

      if (attrsError) throw attrsError;
      setVariantAttributes(attrs || []);

      const { data: skus, error: skusError } = await supabase
        .from('product_skus')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');

      if (skusError) throw skusError;
      setProductSkus(skus || []);

      console.log('[ProductEdit] Loaded variants from DB:', { attrs: attrs?.length, skus: skus?.length });
    } catch (err) {
      console.error('[ProductEdit] Failed to load variant data:', err);
    } finally {
      setLoadingVariants(false);
    }
  }

  // SKU展开/收起
  const toggleSkuExpanded = useCallback((skuId: string) => {
    setExpandedSkus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skuId)) {
        newSet.delete(skuId);
      } else {
        newSet.add(skuId);
      }
      return newSet;
    });
  }, []);

  // 更新SKU规格参数
  const updateSkuSpec = useCallback((skuId: string, specKey: string, specValue: string) => {
    setProductSkus(prev => prev.map(sku => {
      if (sku.id === skuId) {
        const newSpecs = { ...(sku.specs || {}) };
        if (specValue.trim()) {
          newSpecs[specKey] = specValue.trim();
        } else {
          delete newSpecs[specKey];
        }
        return { ...sku, specs: newSpecs };
      }
      return sku;
    }));
    setIsDirty(true);
  }, []);

  // 添加SKU规格参数键
  const addSkuSpecKey = useCallback((skuId: string, specKey: string) => {
    if (!specKey.trim()) return;
    setProductSkus(prev => prev.map(sku => {
      if (sku.id === skuId) {
        const newSpecs = { ...(sku.specs || {}) };
        if (!(specKey in newSpecs)) {
          newSpecs[specKey.trim()] = '';
        }
        return { ...sku, specs: newSpecs };
      }
      return sku;
    }));
    setIsDirty(true);
  }, []);

  // 删除SKU规格参数键
  const removeSkuSpecKey = useCallback((skuId: string, specKey: string) => {
    setProductSkus(prev => prev.map(sku => {
      if (sku.id === skuId) {
        const newSpecs = { ...(sku.specs || {}) };
        delete newSpecs[specKey];
        return { ...sku, specs: newSpecs };
      }
      return sku;
    }));
    setIsDirty(true);
  }, []);

  // 上传SKU图片
  const uploadSkuImage = useCallback(async (skuId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'product');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('上传失败');

      const data = await res.json();

      setProductSkus(prev => prev.map(sku => {
        if (sku.id === skuId) {
          return { ...sku, image_url: data.url };
        }
        return sku;
      }));
      setIsDirty(true);
      success('SKU图片上传成功');
    } catch (err) {
      toastError('图片上传失败，请重试');
    }
  }, [success, toastError]);

  // 更新SKU字段
  const updateSkuField = useCallback((skuId: string, field: string, value: any) => {
    setProductSkus(prev => prev.map(sku => {
      if (sku.id === skuId) {
        return { ...sku, [field]: value };
      }
      return sku;
    }));
    setIsDirty(true);
  }, []);

  // 加载 SKU 阶梯价格
  const loadPriceTiers = useCallback(async (skuId: string) => {
    setLoadingTiers(prev => ({ ...prev, [skuId]: true }));
    try {
      const { data, error } = await supabase
        .from('product_price_tiers')
        .select('*')
        .eq('sku_id', skuId)
        .order('min_quantity', { ascending: true });

      if (error) throw error;
      setPriceTiers(prev => ({ ...prev, [skuId]: data || [] }));
    } catch (err) {
      console.error('加载阶梯价格失败:', err);
    } finally {
      setLoadingTiers(prev => ({ ...prev, [skuId]: false }));
    }
  }, [supabase]);

  // 添加阶梯价格
  const addPriceTier = useCallback((skuId: string) => {
    setPriceTiers(prev => {
      const tiers = prev[skuId] || [];
      const lastTier = tiers[tiers.length - 1];
      const newMin = lastTier ? (lastTier.max_quantity || lastTier.min_quantity + 10) + 1 : 1;
      const newMax = lastTier ? newMin + 9 : 10;

      return {
        ...prev,
        [skuId]: [...tiers, {
          id: `new-${Date.now()}`,
          sku_id: skuId,
          min_quantity: newMin,
          max_quantity: newMax,
          price_usd: 0,
          price_cny: 0,
          price_jpy: null,
          price_thb: null,
          _isNew: true,
        }],
      };
    });
    setIsDirty(true);
  }, []);

  // 更新阶梯价格
  const updatePriceTier = useCallback((skuId: string, tierId: string, field: string, value: any) => {
    setPriceTiers(prev => ({
      ...prev,
      [skuId]: (prev[skuId] || []).map(tier => {
        if (tier.id === tierId) {
          return { ...tier, [field]: value };
        }
        return tier;
      }),
    }));
    setIsDirty(true);
  }, []);

  // 删除阶梯价格
  const removePriceTier = useCallback((skuId: string, tierId: string) => {
    setPriceTiers(prev => ({
      ...prev,
      [skuId]: (prev[skuId] || []).filter(tier => tier.id !== tierId),
    }));
    setIsDirty(true);
  }, []);

  // 保存阶梯价格
  const savePriceTiers = useCallback(async (skuId: string) => {
    const tiers = priceTiers[skuId] || [];
    if (tiers.length === 0) return;

    try {
      // 删除已存在的阶梯价格
      await supabase
        .from('product_price_tiers')
        .delete()
        .eq('sku_id', skuId);

      // 插入新的阶梯价格
      const tiersToInsert = tiers.map(tier => ({
        sku_id: skuId,
        min_quantity: tier.min_quantity,
        max_quantity: tier.max_quantity || null,
        price_usd: tier.price_usd || 0,
        price_cny: tier.price_cny || null,
        price_jpy: tier.price_jpy || null,
        price_thb: tier.price_thb || null,
      }));

      const { error } = await supabase
        .from('product_price_tiers')
        .insert(tiersToInsert);

      if (error) throw error;
      success('阶梯价格保存成功');
      await loadPriceTiers(skuId);
    } catch (err) {
      console.error('保存阶梯价格失败:', err);
      toastError('保存阶梯价格失败');
    }
  }, [priceTiers, supabase, success, toastError, loadPriceTiers]);

  // 多语言读写逻辑
  const getPublishLang = () => ((editForm as any).publish_language || (editForm as any).publishLanguage || 'zh') as string;
  
  const getLocalizedValue = (baseField: string, obj: any = editForm): string => {
    const publishLang = getPublishLang();
    
    // 优先检查带语言后缀的字段（包括源语言）
    const suffixKey = `${baseField}_${editLang}`;
    if (obj && suffixKey in obj) {
      const suffixValue = obj[suffixKey];
      if (suffixValue !== undefined && suffixValue !== null) {
        return String(suffixValue);
      }
    }
    
    // 如果是源语言且没有后缀字段，检查不带后缀的字段
    if (editLang === publishLang) {
      const baseValue = obj?.[baseField];
      if (baseValue !== undefined && baseValue !== null) {
        return String(baseValue);
      }
    }
    
    return '';
  };
  
  const setLocalizedValue = (baseField: string, value: string) => {
    const publishLang = getPublishLang();
    
    // 如果带后缀的字段存在，优先使用带后缀的字段（包括源语言）
    const suffixKey = `${baseField}_${editLang}`;
    const useSuffix = editForm && suffixKey in editForm;
    const field = useSuffix ? suffixKey : (editLang === publishLang ? baseField : `${baseField}_${editLang}`);
    
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // 检查产品是否已发布到任何站点
  const isProductPublished = (): boolean => {
    return product?.site_views?.some((sv: any) => sv.publish_status === 'published') || false;
  };

  // 获取产品已发布的站点名称
  const getPublishedSiteNames = (): string => {
    const sites: string[] = [];
    if (product?.site_views?.some((sv: any) => sv.site_code === 'cn' && sv.publish_status === 'published')) {
      sites.push('中国站');
    }
    if (product?.site_views?.some((sv: any) => sv.site_code === 'intl' && sv.publish_status === 'published')) {
      sites.push('国际站');
    }
    return sites.join('、');
  };

  // 点击保存按钮
  function handleSaveClick() {
    if (!product) return;
    // 如果产品已发布，显示确认对话框
    if (isProductPublished()) {
      setShowSaveConfirmDialog(true);
    } else {
      performSave();
    }
  }

  // 保存
  async function performSave() {
    if (!product) return;
    setShowSaveConfirmDialog(false);
    setSaving(true);
    setSaveError(null);

    // 调试日志：检查 specs 字段
    console.log('[Product Save] About to save:', {
      isNewProduct,
      hasSpecs: 'specs' in editForm,
      specsValue: editForm.specs,
      specsType: typeof editForm.specs,
      specsStringified: editForm.specs ? JSON.stringify(editForm.specs) : 'undefined'
    });

    try {
      let newProductId = productId;

      // 1. 保存产品基本信息
      if (isNewProduct) {
        // 新建产品：使用 POST 创建
        const res = await fetch(`/api/v1/admin/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...editForm,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || '创建产品失败');
        }
        const newData = await res.json();
        newProductId = newData.id;
        // 导航到编辑页面
        router.replace(`/products/${newProductId}`);
      } else {
        // 更新产品：使用 PATCH
        const res = await fetch(`/api/v1/admin/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editForm, updated_at: new Date().toISOString() }),
        });
        if (!res.ok) throw new Error('保存失败');
      }

      // 2. 保存规格属性（先删除旧的，再插入新的）
      if (variantAttributes.length > 0) {
        // 删除旧的规格属性
        await supabase
          .from('product_variant_attributes')
          .delete()
          .eq('product_id', newProductId);

        // 插入新的规格属性
        const attrsToInsert = variantAttributes.map((attr, idx) => ({
          product_id: newProductId,
          attribute_name: attr.attribute_name,
          attribute_values: attr.attribute_values,
          sort_order: idx,
        }));

        const { error: attrsError } = await supabase
          .from('product_variant_attributes')
          .insert(attrsToInsert);

        if (attrsError) throw attrsError;
      } else if (!isNewProduct) {
        // 如果没有规格属性，删除所有旧的（仅更新模式）
        await supabase
          .from('product_variant_attributes')
          .delete()
          .eq('product_id', newProductId);
      }

      // 3. 保存 SKU 数据（销售定价、规格参数、图片等）
      if (productSkus.length > 0) {
        for (const sku of productSkus) {
          await supabase
            .from('product_skus')
            .update({
              selling_price: sku.selling_price || null,
              selling_price_usd: sku.selling_price_usd || null,
              selling_price_jpy: sku.selling_price_jpy || null,
              selling_price_thb: sku.selling_price_thb || null,
              specs: sku.specs || null,
              image_url: sku.image_url || null,
            })
            .eq('id', sku.id);
        }
      }

      setSaveSuccess(true);
      setIsDirty(false);
      success(isNewProduct ? '产品创建成功' : '产品修改已保存' + (isProductPublished() ? '，商城内容已更新' : ''));
      setTimeout(() => setSaveSuccess(false), 2000);

      if (isNewProduct) {
        // 重新加载新产品数据
        const res = await fetch(`/api/v1/admin/products/${newProductId}?view=base`);
        if (res.ok) {
          const json = await res.json();
          setProduct(json.data);
          setEditForm({ ...json.data });
        }
      } else {
        await loadProduct(); // 重新加载产品数据
      }

      console.log('[Product Save] Save completed, reloaded product specs:', product.specs);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '保存失败';
      setSaveError(errorMsg);
      toastError(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  // 兼容旧代码
  async function handleSave() {
    performSave();
  }

  // 保存并上架
  async function handleSaveAndPublish() {
    if (!product || selectedSites.length === 0) return;
    setPublishing(true);
    setSaveError(null);
    try {
      console.log('[Publish] Step 1: Saving product...');
      // 1. 保存产品基本信息
      const saveRes = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, updated_at: new Date().toISOString() }),
      });
      console.log('[Publish] Step 1 response:', saveRes.status);
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Publish] Step 1 failed:', err);
        throw new Error('保存失败: ' + (err.error || saveRes.statusText));
      }

      console.log('[Publish] Step 2: Saving variants...');
      // 2. 保存规格属性
      if (variantAttributes.length > 0) {
        await supabase
          .from('product_variant_attributes')
          .delete()
          .eq('product_id', productId);
        
        const attrsToInsert = variantAttributes.map((attr, idx) => ({
          product_id: productId,
          attribute_name: attr.attribute_name,
          attribute_values: attr.attribute_values,
          sort_order: idx,
        }));
        
        const { error: attrsError } = await supabase
          .from('product_variant_attributes')
          .insert(attrsToInsert);
        
        if (attrsError) {
          console.error('[Publish] Step 2 failed:', attrsError);
          throw attrsError;
        }
      }
      console.log('[Publish] Step 2 complete');

      // 3. 创建站点视图并发布
      console.log('[Publish] Step 3: Creating site views...');
      const siteViewErrors: string[] = [];
      for (const site of selectedSites) {
        console.log(`[Publish] Creating site view for site: ${site}, product: ${productId}`);
        const res = await fetch(`/api/v1/admin/products/${productId}/site-view?site_code=${site}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ site_code: site, publish_status: 'published', is_enabled: true }),
        });
        console.log(`[Publish] Site view response status: ${res.status}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error(`[Publish] Site view error for ${site}:`, err);
          siteViewErrors.push(`${site}: ${err.error || res.statusText}`);
        } else {
          const data = await res.json();
          console.log(`[Publish] Site view created successfully for ${site}:`, data);
        }
      }
      if (siteViewErrors.length > 0) throw new Error(`站点视图创建失败：${siteViewErrors.join(', ')}`);
      console.log('[Publish] Step 3 complete');

      // 4. 更新产品状态为已发布
      console.log('[Publish] Step 4: Updating product status...');
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', productId);
      if (updateError) {
        console.error('[Publish] Step 4 failed:', updateError);
        throw updateError;
      }
      console.log('[Publish] Step 4 complete');

      // 5. 记录审计日志
      console.log('[Publish] Step 5: Recording audit log...');
      const { data: { user } } = await supabase.auth.getUser();
      const { error: auditError } = await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'product',
        action: 'publish',
        target_type: 'product',
        target_id: productId,
        target_name: product.name,
        changes_summary: `上架产品：${product.name}，站点：${selectedSites.join(', ').toUpperCase()}`,
      });
      if (auditError) {
        console.error('[Publish] Step 5 audit log failed (non-critical):', auditError);
        // Don't throw for audit errors, it's not critical
      }
      console.log('[Publish] Step 5 complete');

      setShowPublishDialog(false);
      setIsDirty(false);
      await loadProduct();
      // 获取站点名称
      const siteNames = selectedSites.map(s => s === 'cn' ? '中国站' : '国际站').join('、');
      success(`产品已成功上架到 ${siteNames}`);
      console.log('[Publish] All steps completed successfully!');
    } catch (err) {
      console.error('[Publish] Publish failed:', err);
      const errorMsg = err instanceof Error ? err.message : '上架失败';
      setSaveError(errorMsg);
      toastError(errorMsg);
    } finally {
      setPublishing(false);
    }
  }

  // AI 翻译
  async function handleTranslate() {
    if (!product) return;

    // 显示翻译进度弹框
    setShowTranslateModal(true);
    setTranslating(true);
    setTranslateError(null);
    setTranslateStep(1);
    setTranslateProgress(0);

    // 翻译步骤定义
    const steps = [
      { step: 1, text: '正在分析产品内容...', progress: 10 },
      { step: 2, text: '正在翻译到 English...', progress: 30 },
      { step: 3, text: '正在翻译到 ภาษาไทย...', progress: 50 },
      { step: 4, text: '正在翻译到 日本語...', progress: 70 },
      { step: 5, text: '正在保存翻译结果...', progress: 90 },
    ];

    // 模拟进度更新（让用户看到动态过程）
    const progressInterval = setInterval(() => {
      setTranslateProgress(prev => {
        if (prev >= 85) return prev; // 等待实际完成
        return prev + Math.random() * 5;
      });
    }, 500);

    try {
      // 步骤 1：分析内容
      await new Promise(r => setTimeout(r, 800));
      setTranslateStep(2);
      setTranslateProgress(20);

      // 步骤 2-4：调用翻译 API
      const res = await fetch('/api/products/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '翻译失败');
      }

      // 步骤 5：保存结果
      setTranslateStep(5);
      setTranslateProgress(95);
      await new Promise(r => setTimeout(r, 500));

      // 完成
      clearInterval(progressInterval);
      setTranslateProgress(100);
      setTranslateSuccess(true);
      await loadProduct();

      // 短暂显示完成状态后关闭弹框
      setTimeout(() => {
        setShowTranslateModal(false);
        success('AI 翻译完成，已自动补全英文、泰文、日文内容');
      }, 1000);

    } catch (err) {
      clearInterval(progressInterval);
      setTranslateError(err instanceof Error ? err.message : '翻译失败');
      toastError(err instanceof Error ? err.message : '翻译失败');
      setTimeout(() => {
        setShowTranslateModal(false);
      }, 2000);
    } finally {
      setTranslating(false);
    }
  }

  // 批准
  async function handleApprove() {
    if (!confirm('确定要批准这个产品吗？')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}?action=approve`, { method: 'POST' });
      if (!res.ok) throw new Error('批准失败');
      await loadProduct();
      success('产品已通过审核');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '批准失败';
      setSaveError(errorMsg);
      toastError(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  // 拒绝
  async function handleReject() {
    const reason = prompt('请输入拒绝原因：');
    if (!reason) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}?action=reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) throw new Error('拒绝失败');
      await loadProduct();
      warning('产品已拒绝');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '拒绝失败';
      setSaveError(errorMsg);
      toastError(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  // 下架
  async function handleOfflineFromSite(siteCode: string) {
    const siteName = siteCode === 'cn' ? '中国站' : '国际站';
    if (!confirm(`确定要从 ${siteName} 下架这个产品吗？\n\n下架后，该产品将无法在 ${siteName} 商城购买。`)) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase
        .from('product_site_views')
        .update({
          publish_status: 'offline',
          is_enabled: false
        })
        .eq('product_id', productId)
        .eq('site_code', siteCode);

      if (error) throw error;
      await loadProduct();
      success(`产品已从 ${siteName} 下架`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '下架失败';
      setSaveError(errorMsg);
      toastError(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  // 返回列表
  function handleBack() {
    if (isDirty) {
      setShowLeaveDialog(true);
    } else {
      router.push('/products');
    }
  }

  // 浏览器原生离开确认
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><LoadingState /></div>;

  if (error || !product) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{error || '产品不存在'}</h2>
            <p className="text-slate-500 mb-6">无法加载产品数据</p>
            <Button onClick={handleBack}>返回产品列表</Button>
          </div>
        </Card>
      </div>
    );
  }

  const publishLang = getPublishLang();

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 truncate max-w-md">{editForm.name || '编辑产品'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                product.status === 'pending_review' || product.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                product.status === 'approved' || product.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                product.status === 'rejected' || product.status === 'Rejected' ? 'bg-red-100 text-red-600' :
                product.status === 'published' || product.status === 'Published' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {product.status === 'pending_review' || product.status === 'Pending' ? '待审核' :
                 product.status === 'approved' || product.status === 'Approved' ? '已通过' :
                 product.status === 'rejected' || product.status === 'Rejected' ? '已拒绝' :
                 product.status === 'published' || product.status === 'Published' ? '已发布' : product.status}
              </span>
              {product.translationsComplete ? (
                <span className="text-sky-700 bg-sky-100 px-2 py-0.5 rounded text-xs font-bold">已翻译</span>
              ) : (
                <span className="text-orange-700 bg-orange-100 px-2 py-0.5 rounded text-xs font-bold">待翻译</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleTranslate} loading={translating}
            className={translateSuccess ? '!bg-emerald-500 !text-white' : '!bg-purple-600 hover:!bg-purple-500 !text-white'}>
            {translating ? 'AI 翻译中...' : translateSuccess ? '翻译完成 ✓' : 'AI 补全翻译'}
          </Button>
          {(product.status === 'pending_review' || product.status === 'Pending') && (
            <>
              <Button variant="secondary" onClick={handleApprove} loading={saving} className="!bg-green-600 hover:!bg-green-500 !text-white">✓ 通过</Button>
              <Button variant="secondary" onClick={handleReject} loading={saving} className="!bg-red-600 hover:!bg-red-500 !text-white">✕ 拒绝</Button>
            </>
          )}
          <Button onClick={handleSaveClick} loading={saving} className={saveSuccess ? '!bg-green-500' : ''}>
            {saving ? '保存中...' : saveSuccess ? '已保存 ✓' : '保存修改'}
          </Button>
          {(product.status === 'pending_review' || product.status === 'Pending' || product.status === 'rejected' || product.status === 'Rejected' || product.status === 'draft' || product.status === 'Draft') && (
            <Button onClick={() => setShowPublishDialog(true)} className="!bg-emerald-600 hover:!bg-emerald-500 !text-white">保存并上架</Button>
          )}
        </div>
      </div>

      {(saveError || translateError) && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">{saveError || translateError}</div>
      )}

      {/* 语言切换 */}
      <div className="flex gap-2 flex-wrap sticky top-0 bg-[var(--admin-bg)] py-3 z-10">
        {(['en', 'zh', 'th', 'ja'] as const).map(lang => {
          const isSource = lang === publishLang;
          return (
            <button key={lang} onClick={() => setEditLang(lang)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                editLang === lang ? 'bg-emerald-500 text-black' : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100'
              }`}>
              {lang === 'en' ? 'English' : lang === 'zh' ? '中文' : lang === 'th' ? 'ไทย' : '日本語'}
              {isSource && <span className="ml-1 text-xs opacity-70">(源)</span>}
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'basic', label: '基本信息', icon: '📋' },
          { id: 'category', label: '商品分类', icon: '🏷️' },
          { id: 'variants', label: '规格与 SKU', icon: '📦' },
          { id: 'specs', label: '规格参数', icon: '⚙️' },
          { id: 'seo', label: 'SEO 优化', icon: '🔍' },
          { id: 'publish', label: '发布管理', icon: '🌐' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.id ? 'bg-emerald-500 text-black' : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100'
            }`}>
            <span className="mr-1">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Section 1: 基本信息 */}
      {activeTab === 'basic' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">📋</span> 基本信息
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500">发布语言:</span>
              <span className="text-sm text-slate-900 font-medium">
                {publishLang === 'zh' ? '中文' : publishLang === 'en' ? 'English' : publishLang === 'ja' ? '日本語' : 'ภาษาไทย'}
              </span>
              <span className="text-xs text-slate-600">(AI 翻译将从此语言翻译到其他语言)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  商品名称 ({editLang === publishLang ? `${editLang} - 源` : editLang})
                </label>
                <input type="text" value={getLocalizedValue('name')} onChange={(e) => setLocalizedValue('name', e.target.value)} 
                  className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">品牌 Brand</label>
                <input type="text" value={editForm.brand || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, brand: e.target.value })); setIsDirty(true); }} 
                  className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                商品描述 ({editLang === publishLang ? `${editLang} - 源` : editLang})
              </label>
              <textarea value={getLocalizedValue('description')} onChange={(e) => setLocalizedValue('description', e.target.value)}  rows={4}
                className="w-full min-h-[100px] px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                商品详情 ({editLang === publishLang ? `${editLang} - 源` : editLang})
              </label>
              {/* 编辑模式 */}
              
                <RichTextEditor
                  value={getLocalizedValue('rich_description') || ''}
                  onChange={(value) => {
                    setLocalizedValue('rich_description', value);
                    setIsDirty(true);
                  }}
                  placeholder="请输入商品详情内容..."
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">商品图片</label>
              {/* 显示 product_images 中的图片 */}
              {editForm.images && editForm.images.length > 0 ? (
                <div className="flex flex-wrap gap-3 mb-3">
                  {editForm.images.map((img: any, idx: number) => (
                    <div key={img.id || idx} className="relative group">
                      <img
                        src={img.url}
                        alt={img.type || `图片 ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-slate-200/50"
                      />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                        {img.type === 'main' ? '主图' : img.type || '图片'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : editForm.image_url ? (
                <img src={editForm.image_url} alt="商品" className="w-32 h-32 object-cover rounded-lg mb-2 border border-slate-200/50" />
              ) : (
                <div className="w-32 h-32 bg-slate-100 rounded-lg mb-2 flex items-center justify-center text-slate-400 text-sm">
                  暂无图片
                </div>
              )}
              {editForm.image_url && (
                <input type="text" value={editForm.image_url} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, image_url: e.target.value })); setIsDirty(true); }}  placeholder="图片 URL"
                  className="w-full px-4 py-2 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">专科分类 Specialty</label>
              <input type="text" value={editForm.specialty || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, specialty: e.target.value })); setIsDirty(true); }}  placeholder="例如：Orthodontics, Oral Surgery"
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">来源 URL Source URL</label>
              <input type="url" value={editForm.source_url || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, source_url: e.target.value })); setIsDirty(true); }}  placeholder="例如：https://www.alibaba.com/product-detail/..."
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" />
              <p className="mt-1 text-xs text-slate-500">产品来源链接，用于追溯原始供应商或采购渠道</p>
            </div>

            {/* 物流与贸易信息 */}
            <div className="border-t pt-4 mt-4">
              <h5 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-lg">🚚</span> 物流与贸易信息
              </h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">定价模式</label>
                  <select value={editForm.pricing_mode || 'fixed'} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, pricing_mode: e.target.value })); setIsDirty(true); }} 
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50">
                    <option value="fixed">固定价格</option>
                    <option value="inquiry">询价模式</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">发货时间</label>
                  <input type="text" value={getLocalizedValue('delivery_time') || editForm.delivery_time_en || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, delivery_time: e.target.value, delivery_time_en: e.target.value })); setIsDirty(true); }} 
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="如：3-5个工作日" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">最小起订量</label>
                  <input type="number" min="1" value={editForm.min_order_quantity || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, min_order_quantity: Number(e.target.value) })); setIsDirty(true); }} 
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="1" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">包装信息</label>
                  <input type="text" value={editForm.packaging_info || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, packaging_info: e.target.value })); setIsDirty(true); }} 
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="如：纸箱包装，每箱10件" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">保修信息</label>
                  <input type="text" value={editForm.warranty_info || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, warranty_info: e.target.value })); setIsDirty(true); }} 
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="如：整机保修1年" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">产品尺寸</label>
                  <input type="text" value={editForm.dimensions || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, dimensions: e.target.value })); setIsDirty(true); }} 
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="如：30x20x15 cm" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">产品视频</label>
                  <input type="url" value={editForm.video_url || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, video_url: e.target.value })); setIsDirty(true); }} 
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="https://..." />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Section 2: 商品分类 */}
      {activeTab === 'category' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">🏷️</span> 商品分类
          </h4>
          <div className="space-y-4">
            {loadingCategories ? (
              <div className="flex items-center justify-center py-12"><LoadingState /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">一级分类</label>
                    <select 
                      value={editForm.category_id || ''} 
                      onChange={(e) => { 
                        const categoryId = e.target.value;
                        setEditForm((prev: any) => ({ ...prev, category_id: categoryId, subcategory_id: '' })); 
                        setIsDirty(true); 
                      }} 
                      
                      className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                    >
                      <option value="">选择一级分类</option>
                      {categories.filter(c => c.level === 1).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">二级分类</label>
                    <select 
                      value={editForm.subcategory_id || ''} 
                      onChange={(e) => { 
                        setEditForm((prev: any) => ({ ...prev, subcategory_id: e.target.value })); 
                        setIsDirty(true); 
                      }} 
                      disabled={!editForm.category_id}
                      className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                    >
                      <option value="">选择二级分类</option>
                      {categories
                        .filter(c => c.level === 2 && c.parent_id === editForm.category_id)
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                  </div>
                </div>
                {editForm.category_id && (
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-sm text-slate-600 mb-2">当前分类路径:</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                        {categories.find(c => c.id === editForm.category_id)?.name || '未知'}
                      </span>
                      {editForm.subcategory_id && (
                        <>
                          <span className="text-slate-400">/</span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {categories.find(c => c.id === editForm.subcategory_id)?.name || '未知'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Section 3: 规格与 SKU */}
      {activeTab === 'variants' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">📦</span> 规格与 SKU
          </h4>
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>多规格系统：</strong>为商品添加多个规格维度（如颜色、尺寸、型号），系统会自动生成所有组合，每个组合可设置独立的价格和库存。
              </p>
            </div>

            {/* 规格属性列表 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-bold text-slate-900">规格维度</h5>
                <button 
                  onClick={() => setVariantAttributes(prev => [...prev, { id: `new-${Date.now()}`, attribute_name: '', attribute_values: [], product_id: productId }])}
                  
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  + 添加规格
                </button>
              </div>
              <div className="space-y-3">
                {variantAttributes.map((attr, idx) => (
                  <div key={attr.id || idx} className="border rounded-xl p-4 bg-slate-50">
                    <div className="flex items-center gap-3 mb-3">
                      <input 
                        type="text" 
                        value={attr.attribute_name || ''} 
                        onChange={(e) => {
                          const newAttrs = [...variantAttributes];
                          newAttrs[idx].attribute_name = e.target.value;
                          setVariantAttributes(newAttrs);
                          setIsDirty(true);
                        }}
                        
                        placeholder="规格名称（如：颜色、尺寸、型号）"
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                      />
                      <button 
                        onClick={() => {
                          const newAttrs = variantAttributes.filter((_, i) => i !== idx);
                          setVariantAttributes(newAttrs);
                          setIsDirty(true);
                        }}
                        
                        className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">规格值（用逗号分隔）</label>
                      <input 
                        type="text" 
                        value={attr.attribute_values?.join(', ') || ''} 
                        onChange={(e) => {
                          const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                          const newAttrs = [...variantAttributes];
                          newAttrs[idx].attribute_values = values;
                          setVariantAttributes(newAttrs);
                          setIsDirty(true);
                        }}
                        
                        placeholder="例如：红色，蓝色，白色 或 S, M, L, XL"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                ))}
                {variantAttributes.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p>暂无规格维度，点击"添加规格"开始设置</p>
                  </div>
                )}
              </div>
            </div>

            {/* SKU 列表 - 无论有没有规格维度都显示 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-bold text-slate-900">SKU 列表 ({productSkus.length} 个)</h5>
                <p className="text-xs text-slate-400">点击展开行可编辑规格参数和图片</p>
              </div>
              {productSkus.length > 0 ? (
                <div className="border rounded-xl overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="w-10 px-2 py-3"></th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase">SKU 编码</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase">规格组合</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase">供货价</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase">建议零售价</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-emerald-600 uppercase bg-emerald-50">CNY 销售价</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-blue-600 uppercase bg-blue-50">USD 销售价</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-purple-600 uppercase bg-purple-50">JPY 销售价</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-amber-600 uppercase bg-amber-50">THB 销售价</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase">库存</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productSkus.map((sku) => {
                        const isExpanded = expandedSkus.has(sku.id);
                        return (
                          <React.Fragment key={sku.id}>
                            <tr className="hover:bg-slate-50">
                              <td className="px-2 py-3">
                                <button
                                  onClick={() => toggleSkuExpanded(sku.id)}
                                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                                  title={isExpanded ? '收起' : '展开编辑规格参数和图片'}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                              </td>
                              <td className="px-3 py-3 text-slate-900 font-mono text-xs">{sku.sku_code}</td>
                              <td className="px-3 py-3">
                                {sku.attribute_combination && Object.keys(sku.attribute_combination).length > 0 ? (
                                  <div className="flex gap-1 flex-wrap">
                                    {Object.entries(sku.attribute_combination).map(([key, value]) => (
                                      <span key={key} className="px-2 py-1 bg-slate-100 rounded text-xs">
                                        {key}: {String(value)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs">默认SKU</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-slate-900">¥{sku.price}</td>
                              <td className="px-3 py-3 text-slate-500">{sku.suggested_retail_price ? `¥${sku.suggested_retail_price}` : '-'}</td>
                              {/* CNY 销售价 */}
                              <td className="px-3 py-2 bg-emerald-50/50">
                                <div className="flex items-center gap-1">
                                  <span className="text-emerald-600 text-xs">¥</span>
                                  <input type="number" step="0.01" min="0" value={sku.selling_price || ''}
                                    onChange={(e) => updateSkuField(sku.id, 'selling_price', parseFloat(e.target.value) || null)}
                                    className="w-20 px-2 py-1 border border-emerald-200 rounded text-sm text-center"
                                    placeholder="CNY"
                                  />
                                </div>
                              </td>
                              {/* USD 销售价 */}
                              <td className="px-3 py-2 bg-blue-50/50">
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-600 text-xs">$</span>
                                  <input type="number" step="0.01" min="0" value={sku.selling_price_usd || ''}
                                    onChange={(e) => updateSkuField(sku.id, 'selling_price_usd', parseFloat(e.target.value) || null)}
                                    className="w-20 px-2 py-1 border border-blue-200 rounded text-sm text-center"
                                    placeholder="USD"
                                  />
                                </div>
                              </td>
                              {/* JPY 销售价 */}
                              <td className="px-3 py-2 bg-purple-50/50">
                                <div className="flex items-center gap-1">
                                  <span className="text-purple-600 text-xs">¥</span>
                                  <input type="number" step="1" min="0" value={sku.selling_price_jpy || ''}
                                    onChange={(e) => updateSkuField(sku.id, 'selling_price_jpy', parseFloat(e.target.value) || null)}
                                    className="w-20 px-2 py-1 border border-purple-200 rounded text-sm text-center"
                                    placeholder="JPY"
                                  />
                                </div>
                              </td>
                              {/* THB 销售价 */}
                              <td className="px-3 py-2 bg-amber-50/50">
                                <div className="flex items-center gap-1">
                                  <span className="text-amber-600 text-xs">฿</span>
                                  <input type="number" min="0" value={sku.selling_price_thb || ''}
                                    onChange={(e) => updateSkuField(sku.id, 'selling_price_thb', parseInt(e.target.value) || null)}
                                    className="w-20 px-2 py-1 border border-amber-200 rounded text-sm text-center"
                                    placeholder="THB(整数)"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-3 text-slate-900">{sku.stock_quantity ?? '-'}</td>
                            </tr>
                            {/* 展开行 - 图片和规格参数编辑 */}
                            {isExpanded && (
                              <tr key={`${sku.id}-expanded`} className="bg-slate-50">
                                <td colSpan={10} className="px-6 py-4">
                                  <div className="flex gap-8">
                                    {/* SKU 图片 */}
                                    <div className="flex-shrink-0">
                                      <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                        SKU 图片
                                      </p>
                                      <div className="relative w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg overflow-hidden hover:border-blue-400 transition-colors bg-white">
                                        {sku.image_url ? (
                                          <>
                                            <img
                                              src={sku.image_url}
                                              alt="SKU"
                                              className="w-full h-full object-cover"
                                            />
                                            <button
                                              onClick={() => updateSkuField(sku.id, 'image_url', null)}
                                              className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </>
                                        ) : (
                                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                            <input
                                              type="file"
                                              accept="image/jpeg,image/png,image/webp"
                                              className="hidden"
                                              onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) uploadSkuImage(sku.id, file);
                                              }}
                                            />
                                            <Upload className="w-5 h-5 text-slate-400" />
                                            <span className="text-xs text-slate-400 mt-1">上传</span>
                                          </label>
                                        )}
                                      </div>
                                    </div>

                                    {/* SKU 规格参数 */}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                          <Settings2 className="w-3 h-3" />
                                          SKU 规格参数
                                        </p>
                                        <div className="flex gap-2">
                                          <select
                                            onChange={e => {
                                              if (e.target.value) {
                                                addSkuSpecKey(sku.id, e.target.value);
                                                e.target.value = '';
                                              }
                                            }}
                                            className="text-xs border border-slate-300 rounded px-2 py-1"
                                          >
                                            <option value="">添加参数...</option>
                                            {SKU_SPEC_PRESETS.filter(p => !(sku.specs && p in sku.specs)).map(preset => (
                                              <option key={preset} value={preset}>{preset}</option>
                                            ))}
                                          </select>
                                          <input
                                            type="text"
                                            placeholder="自定义参数名"
                                            className="text-xs border border-slate-300 rounded px-2 py-1 w-24"
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') {
                                                const value = (e.target as HTMLInputElement).value;
                                                if (value.trim()) {
                                                  addSkuSpecKey(sku.id, value);
                                                  (e.target as HTMLInputElement).value = '';
                                                }
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {sku.specs && Object.entries(sku.specs).map(([key, value]) => (
                                          <div key={key} className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1.5">
                                            <span className="text-xs text-slate-500 w-14 truncate">{key}:</span>
                                            <input
                                              type="text"
                                              value={String(value)}
                                              onChange={e => updateSkuSpec(sku.id, key, e.target.value)}
                                              className="flex-1 text-xs border-none outline-none bg-transparent"
                                              placeholder="值"
                                            />
                                            <button
                                              onClick={() => removeSkuSpecKey(sku.id, key)}
                                              className="text-slate-400 hover:text-red-500"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                        {(!sku.specs || Object.keys(sku.specs).length === 0) && (
                                          <p className="text-xs text-slate-400 col-span-full py-2">
                                            暂无规格参数，可从上方添加
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 阶梯价格设置 */}
                                  <div className="mt-6 border-t border-slate-200 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                        <span className="text-sm">📊</span>
                                        阶梯价格（批量折扣）
                                      </p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => loadPriceTiers(sku.id)}
                                          className="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-100"
                                        >
                                          加载
                                        </button>
                                        <button
                                          onClick={() => addPriceTier(sku.id)}
                                          className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1"
                                        >
                                          <Plus className="w-3 h-3" /> 添加阶梯
                                        </button>
                                      </div>
                                    </div>

                                    {loadingTiers[sku.id] ? (
                                      <p className="text-xs text-slate-400">加载中...</p>
                                    ) : priceTiers[sku.id] && priceTiers[sku.id].length > 0 ? (
                                      <div className="space-y-3">
                                        {/* 折扣率快速设置 */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                          <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-xs font-bold text-blue-700">快捷设置折扣：</span>
                                            <div className="flex items-center gap-1">
                                              {[5, 10, 15, 20, 25, 30].map(discount => (
                                                <button
                                                  key={discount}
                                                  onClick={() => {
                                                    // 获取所有币种的基准价格
                                                    const baseUsd = sku.selling_price_usd || sku.price || 0;
                                                    const baseCny = sku.selling_price || 0;
                                                    const baseJpy = sku.selling_price_jpy || 0;
                                                    const baseThb = sku.selling_price_thb || 0;
                                                    
                                                    const newTiers = (priceTiers[sku.id] || []).map((tier, idx) => {
                                                      const tierDiscount = discount + (idx * 5); // 每级递增5%
                                                      const multiplier = (100 - tierDiscount) / 100;
                                                      
                                                      return {
                                                        ...tier,
                                                        // USD: 支持小数，保留两位
                                                        price_usd: baseUsd ? Math.round(baseUsd * multiplier * 100) / 100 : tier.price_usd,
                                                        // CNY: 支持小数，保留两位
                                                        price_cny: baseCny ? Math.round(baseCny * multiplier * 100) / 100 : tier.price_cny,
                                                        // JPY: 取整数
                                                        price_jpy: baseJpy ? Math.round(baseJpy * multiplier) : tier.price_jpy,
                                                        // THB: 取整数
                                                        price_thb: baseThb ? Math.round(baseThb * multiplier) : tier.price_thb,
                                                      };
                                                    });
                                                    
                                                    setPriceTiers(prev => ({ ...prev, [sku.id]: newTiers }));
                                                    setIsDirty(true);
                                                  }}
                                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                  -{discount}%
                                                </button>
                                              ))}
                                            </div>
                                            <span className="text-xs text-blue-500">（每级递增5%）</span>
                                          </div>
                                          <p className="text-xs text-blue-500 mt-2">
                                            💡 点击折扣率会自动计算所有币种的阶梯价格（USD/CNY/THB保留两位小数，JPY取整数）
                                          </p>
                                        </div>

                                        <div className="grid grid-cols-8 gap-2 text-xs font-bold text-slate-500 bg-white p-2 rounded border">
                                          <span>起订量</span>
                                          <span>截止量</span>
                                          <span className="text-blue-600">USD $</span>
                                          <span className="text-emerald-600">CNY ¥</span>
                                          <span className="text-purple-600">JPY ¥</span>
                                          <span className="text-amber-600">THB ฿</span>
                                          <span>折扣</span>
                                          <span>操作</span>
                                        </div>
                                        {priceTiers[sku.id].map((tier, idx) => {
                                          // 计算各币种的折扣
                                          const baseUsd = sku.selling_price_usd || sku.price || 0;
                                          const baseCny = sku.selling_price || 0;
                                          const baseJpy = sku.selling_price_jpy || 0;
                                          const baseThb = sku.selling_price_thb || 0;
                                          
                                          const discountUsd = baseUsd > 0 && tier.price_usd ? Math.round((1 - tier.price_usd / baseUsd) * 100) : 0;
                                          const discountCny = baseCny > 0 && tier.price_cny ? Math.round((1 - tier.price_cny / baseCny) * 100) : 0;
                                          const discountJpy = baseJpy > 0 && tier.price_jpy ? Math.round((1 - tier.price_jpy / baseJpy) * 100) : 0;
                                          const discountThb = baseThb > 0 && tier.price_thb ? Math.round((1 - tier.price_thb / baseThb) * 100) : 0;
                                          
                                          // 取第一个有值的折扣显示
                                          const discountPercent = discountUsd || discountCny || discountJpy || discountThb || 0;
                                          
                                          return (
                                            <div key={tier.id} className="grid grid-cols-8 gap-2 text-xs bg-white p-2 rounded border border-slate-200">
                                              <input
                                                type="number"
                                                min="1"
                                                value={tier.min_quantity}
                                                onChange={(e) => updatePriceTier(sku.id, tier.id, 'min_quantity', parseInt(e.target.value) || 1)}
                                                className="px-2 py-1 border border-slate-300 rounded w-full"
                                              />
                                              <input
                                                type="number"
                                                min="1"
                                                value={tier.max_quantity || ''}
                                                onChange={(e) => updatePriceTier(sku.id, tier.id, 'max_quantity', parseInt(e.target.value) || null)}
                                                className="px-2 py-1 border border-slate-300 rounded w-full"
                                                placeholder="∞"
                                              />
                                              <div className="relative">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={tier.price_usd || ''}
                                                  onChange={(e) => updatePriceTier(sku.id, tier.id, 'price_usd', parseFloat(e.target.value) || 0)}
                                                  className="px-2 py-1 border border-blue-200 rounded w-full"
                                                />
                                                {discountUsd > 0 && <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-1 rounded">-{discountUsd}%</span>}
                                              </div>
                                              <div className="relative">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={tier.price_cny || ''}
                                                  onChange={(e) => updatePriceTier(sku.id, tier.id, 'price_cny', parseFloat(e.target.value) || null)}
                                                  className="px-2 py-1 border border-emerald-200 rounded w-full"
                                                />
                                                {discountCny > 0 && <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-1 rounded">-{discountCny}%</span>}
                                              </div>
                                              <div className="relative">
                                                <input
                                                  type="number"
                                                  value={tier.price_jpy || ''}
                                                  onChange={(e) => updatePriceTier(sku.id, tier.id, 'price_jpy', parseInt(e.target.value) || null)}
                                                  className="px-2 py-1 border border-purple-200 rounded w-full"
                                                  placeholder="整数"
                                                />
                                                {discountJpy > 0 && <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-1 rounded">-{discountJpy}%</span>}
                                              </div>
                                              <div className="relative">
                                                <input
                                                  type="number"
                                                  value={tier.price_thb || ''}
                                                  onChange={(e) => updatePriceTier(sku.id, tier.id, 'price_thb', parseInt(e.target.value) || null)}
                                                  className="px-2 py-1 border border-amber-200 rounded w-full"
                                                  placeholder="整数"
                                                />
                                                {discountThb > 0 && <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-1 rounded">-{discountThb}%</span>}
                                              </div>
                                              <span className={`px-2 py-1 text-center font-bold rounded ${
                                                discountPercent > 0 ? 'bg-red-100 text-red-600' : 'text-slate-400'
                                              }`}>
                                                {discountPercent > 0 ? `-${discountPercent}%` : '-'}
                                              </span>
                                              <button
                                                onClick={() => removePriceTier(sku.id, tier.id)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                        <button
                                          onClick={() => savePriceTiers(sku.id)}
                                          className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                                        >
                                          保存阶梯价格
                                        </button>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-400">
                                        暂无阶梯价格设置。点击"添加阶梯"设置批量折扣价格。
                                      </p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-2">
                                      💡 设置不同数量的批发价格，例如：1-9件原价，10-49件95折，50+件9折
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-400 mb-3">暂无 SKU 数据</p>
                </div>
              )}
              
              {/* 批量定价工具 */}
              {productSkus.length > 0 && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                  <h6 className="text-sm font-bold text-slate-700 mb-3">批量定价工具</h6>
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">按供货价倍数设置</label>
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.1" min="1" defaultValue="1.5" id="priceMultiplier" className="w-20 px-2 py-1 border rounded text-sm" />
                        <span className="text-sm text-slate-500">倍</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">目标币种</label>
                      <select id="targetCurrency" className="px-2 py-1 border rounded text-sm">
                        <option value="cny">CNY 人民币</option>
                        <option value="usd">USD 美元</option>
                        <option value="jpy">JPY 日元</option>
                        <option value="thb">THB 泰铢</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        const multiplier = parseFloat((document.getElementById('priceMultiplier') as HTMLInputElement)?.value || '1.5');
                        const currency = (document.getElementById('targetCurrency') as HTMLSelectElement)?.value || 'cny';
                        const fieldMap: Record<string, string> = { cny: 'selling_price', usd: 'selling_price_usd', jpy: 'selling_price_jpy', thb: 'selling_price_thb' };
                        const field = fieldMap[currency];
                        const updatedSkus = productSkus.map((s: any) => ({...s, [field]: Math.round(s.price * multiplier * 100) / 100}));
                        setProductSkus(updatedSkus);
                        setIsDirty(true);
                        success(`已按供货价的 ${multiplier} 倍设置${currency.toUpperCase()}销售价`);
                      }}
                      className="px-4 py-1.5 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700"
                    >
                      批量应用
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">提示：销售价 = 供货价 × 倍数</p>
                </div>
              )}
            </div>

            {/* 保存提示 */}
            {variantAttributes.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  💡 <strong>提示：</strong>规格设置完成后，请点击右上角"保存修改"按钮保存。
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Section 5: 规格参数 */}
      {activeTab === 'specs' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">⚙️</span> 规格参数
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">规格参数 (JSON 格式)</label>
              <textarea value={JSON.stringify(editForm.specifications || {}, null, 2)} onChange={(e) => {
                try { const specifications = JSON.parse(e.target.value); setEditForm((prev: any) => ({ ...prev, specifications })); setIsDirty(true); } catch { } }}  rows={10}
                  className="w-full min-h-[200px] px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm font-mono text-slate-900 focus:border-emerald-500 outline-none resize-none disabled:opacity-50"
                  placeholder={`{\n  "material": "医用级不锈钢",\n  "size": "10cm x 5cm",\n  "weight": "200g"\n}`} />
            </div>
          </div>
        </Card>
      )}

      {/* Section 6: SEO 优化 */}
      {activeTab === 'seo' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">🔍</span> SEO 优化与 FAQ
          </h4>
          <div className="space-y-6">
            {/* SEO 字段 */}
            <div className="space-y-4">
              <h5 className="text-sm font-bold text-slate-900">SEO 元数据</h5>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">核心关键词</label>
                <input type="text" value={editForm.focus_keyword || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, focus_keyword: e.target.value })); setIsDirty(true); }} 
                  className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="例如：兽用手术器械，宠物医疗耗材" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Meta 标题</label>
                <input type="text" value={editForm.meta_title || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, meta_title: e.target.value })); setIsDirty(true); }}  maxLength={60}
                  className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="搜索引擎结果中显示的标题" />
                <p className="mt-1 text-xs text-slate-500">建议长度：50-60 个字符，当前长度：{editForm.meta_title?.length || 0}</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Meta 描述</label>
                <textarea value={editForm.meta_description || ''} onChange={(e) => { setEditForm((prev: any) => ({ ...prev, meta_description: e.target.value })); setIsDirty(true); }}  maxLength={160} rows={3}
                  className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none disabled:opacity-50" placeholder="搜索引擎结果中显示的产品描述" />
                <p className="mt-1 text-xs text-slate-500">建议长度：150-160 个字符，当前长度：{editForm.meta_description?.length || 0}</p>
              </div>
            </div>

            {/* FAQ 字段 */}
            <div className="border-t pt-6">
              <h5 className="text-sm font-bold text-slate-900 mb-4">FAQ 常见问题</h5>
              <div className="space-y-3">
                {(editForm.faq || []).map((faq: any, idx: number) => (
                  <div key={idx} className="border rounded-xl p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-slate-900">问题 {idx + 1}</span>
                      <button onClick={() => {
                        const newFaq = editForm.faq.filter((_: any, i: number) => i !== idx);
                        setEditForm((prev: any) => ({ ...prev, faq: newFaq }));
                        setIsDirty(true);
                      }}  className="text-red-600 hover:text-red-800 p-1">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">问题</label>
                        <input type="text" value={faq.question || ''} onChange={(e) => {
                          const newFaq = [...editForm.faq];
                          newFaq[idx].question = e.target.value;
                          setEditForm((prev: any) => ({ ...prev, faq: newFaq }));
                          setIsDirty(true);
                        }} 
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="客户可能会问的问题" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">回答</label>
                        <textarea value={faq.answer || ''} onChange={(e) => {
                          const newFaq = [...editForm.faq];
                          newFaq[idx].answer = e.target.value;
                          setEditForm((prev: any) => ({ ...prev, faq: newFaq }));
                          setIsDirty(true);
                        }}  rows={3}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="详细、专业的回答" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => {
                setEditForm((prev: any) => ({ ...prev, faq: [...(prev.faq || []), { question: '', answer: '' }] }));
                setIsDirty(true);
              }} 
                className="mt-3 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                + 添加 FAQ
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Section 4: 发布管理 */}
      {activeTab === 'publish' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">🌐</span> 发布管理
          </h4>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">站点发布状态</h3>
              <div className="space-y-3">
                {[
                  { code: 'cn', label: '中国站 (CN)', desc: 'www.vetsphere.net' },
                  { code: 'intl', label: '国际站 (INTL)', desc: 'intl.vetsphere.net' },
                ].map(site => {
                  const isPublished = product.site_views?.some((sv: any) => sv.site_code === site.code && sv.publish_status === 'published');
                  return (
                    <div key={site.code} className="flex items-center justify-between p-4 border rounded-xl">
                      <div>
                        <p className="font-medium text-slate-900">{site.label}</p>
                        <p className="text-sm text-slate-500">{site.desc}</p>
                        {isPublished && (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            已发布
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!isPublished ? (
                          <button onClick={() => { setSelectedSites([site.code]); handleSaveAndPublish(); }} 
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700">
                            发布
                          </button>
                        ) : (
                          <button onClick={() => handleOfflineFromSite(site.code)} 
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 bg-slate-500 text-white hover:bg-slate-600">
                            下架
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {(product.approved_at || product.rejection_reason || product.published_at) && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-bold text-slate-900 mb-3">审核信息</h4>
                <div className="space-y-2 text-sm">
                  {product.approved_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">批准时间:</span>
                      <span className="text-slate-900">{new Date(product.approved_at).toLocaleString()}</span>
                    </div>
                  )}
                  {product.rejection_reason && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">拒绝原因:</span>
                      <span className="text-red-600">{product.rejection_reason}</span>
                    </div>
                  )}
                  {product.published_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">发布时间:</span>
                      <span className="text-slate-900">{new Date(product.published_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 离开确认对话框 */}
      <ConfirmDialog open={showLeaveDialog} title="确认离开" message="您有未保存的更改，确定要离开吗？所有未保存的更改将丢失。" confirmText="确认离开" onConfirm={() => router.push('/products')} onCancel={() => setShowLeaveDialog(false)} danger />

      {/* 上架站点选择弹窗 */}
      {showPublishDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">保存并上架产品</h3>
            <p className="text-sm text-slate-500 mb-5">请选择要上架的站点，产品将保存并发布到所选站点。</p>
            <div className="space-y-3 mb-6">
              {[
                { code: 'cn', label: '中国站 (CN)', desc: '面向中国大陆用户' },
                { code: 'intl', label: '国际站 (INTL)', desc: '面向海外用户' },
              ].map(site => (
                <label key={site.code} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedSites.includes(site.code) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="checkbox" checked={selectedSites.includes(site.code)} onChange={(e) => {
                    if (e.target.checked) setSelectedSites(prev => [...prev, site.code]);
                    else setSelectedSites(prev => prev.filter(s => s !== site.code));
                  }} className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{site.label}</div>
                    <div className="text-xs text-slate-500">{site.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            {saveError && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{saveError}</div>}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowPublishDialog(false); setSaveError(null); }} disabled={publishing}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">取消</button>
              <button onClick={handleSaveAndPublish} disabled={publishing || selectedSites.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {publishing ? '上架中...' : `确认上架 (${selectedSites.length} 个站点)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 通知容器 */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* 保存确认对话框 - 已发布产品修改确认 */}
      <ConfirmDialog
        open={showSaveConfirmDialog}
        title="确认修改已发布产品"
        message={`此产品已在 ${getPublishedSiteNames()} 上架，您的修改将直接影响商城中在售的商品内容。确定要保存修改吗？`}
        confirmText="确认保存"
        cancelText="取消"
        variant="warning"
        onConfirm={performSave}
        onCancel={() => setShowSaveConfirmDialog(false)}
        loading={saving}
      />

      {/* AI 翻译进度弹框 */}
      {showTranslateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              {/* 动态图标 */}
              <div className="w-16 h-16 mx-auto mb-4 relative">
                {translateProgress >= 100 ? (
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : translateError ? (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                )}
              </div>

              {/* 标题 */}
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {translateError ? '翻译失败' : translateProgress >= 100 ? '翻译完成' : 'AI 智能翻译中'}
              </h3>

              {/* 当前步骤 */}
              {!translateError && translateProgress < 100 && (
                <div className="mb-4">
                  <p className="text-sm text-slate-600 mb-3">
                    {translateStep === 1 && '正在分析产品内容...'}
                    {translateStep === 2 && '正在翻译到 English...'}
                    {translateStep === 3 && '正在翻译到 ภาษาไทย...'}
                    {translateStep === 4 && '正在翻译到 日本語...'}
                    {translateStep === 5 && '正在保存翻译结果...'}
                  </p>

                  {/* 进度条 */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${translateProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500">{Math.round(translateProgress)}%</p>
                </div>
              )}

              {/* 完成状态 */}
              {translateProgress >= 100 && !translateError && (
                <div className="text-left bg-emerald-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-emerald-700 font-medium mb-2">已完成翻译：</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">✓ English</span>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">✓ ภาษาไทย</span>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">✓ 日本語</span>
                  </div>
                </div>
              )}

              {/* 错误状态 */}
              {translateError && (
                <div className="text-left bg-red-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-600">{translateError}</p>
                </div>
              )}

              {/* 翻译说明 */}
              {translateProgress < 100 && !translateError && (
                <p className="text-xs text-slate-400">
                  正在使用通义千问 AI 进行多语言翻译，请稍候...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
