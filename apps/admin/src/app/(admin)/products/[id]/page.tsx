'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, LoadingState, ConfirmDialog } from '@/components/ui';

type Lang = 'en' | 'zh' | 'th' | 'ja';

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

  // UI 状态
  const [activeTab, setActiveTab] = useState('basic');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedSites, setSelectedSites] = useState<string[]>(['cn']);
  const [publishing, setPublishing] = useState(false);

  // 分类和 SKU 状态
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [variantAttributes, setVariantAttributes] = useState<any[]>([]);
  const [productSkus, setProductSkus] = useState<any[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // 只读模式
  const isReadOnly = product?.status === 'published';

  // 加载产品数据
  useEffect(() => {
    loadProduct();
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

  // 多语言读写逻辑
  const getPublishLang = () => ((editForm as any).publishLanguage || 'zh') as string;
  
  const getLocalizedValue = (baseField: string, obj: any = editForm): string => {
    const publishLang = getPublishLang();
    const suffixValue = obj?.[`${baseField}_${editLang}`];
    if (suffixValue) return suffixValue;
    if (editLang === publishLang) return obj?.[baseField] || '';
    return '';
  };
  
  const setLocalizedValue = (baseField: string, value: string) => {
    const publishLang = getPublishLang();
    const field = editLang === publishLang ? baseField : `${baseField}_${editLang}`;
    setEditForm(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // 保存
  async function handleSave() {
    if (!product) return;
    setSaving(true);
    setSaveError(null);
    
    // 调试日志：检查 specs 字段
    console.log('[Product Save] About to save:', {
      hasSpecs: 'specs' in editForm,
      specsValue: editForm.specs,
      specsType: typeof editForm.specs,
      specsStringified: editForm.specs ? JSON.stringify(editForm.specs) : 'undefined'
    });
    
    try {
      // 1. 保存产品基本信息
      const res = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, updated_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('保存失败');
      
      // 2. 保存规格属性（先删除旧的，再插入新的）
      if (variantAttributes.length > 0) {
        // 删除旧的规格属性
        await supabase
          .from('product_variant_attributes')
          .delete()
          .eq('product_id', productId);
        
        // 插入新的规格属性
        const attrsToInsert = variantAttributes.map((attr, idx) => ({
          product_id: productId,
          attribute_name: attr.attribute_name,
          attribute_values: attr.attribute_values,
          sort_order: idx,
        }));
        
        const { error: attrsError } = await supabase
          .from('product_variant_attributes')
          .insert(attrsToInsert);
        
        if (attrsError) throw attrsError;
      } else {
        // 如果没有规格属性，删除所有旧的
        await supabase
          .from('product_variant_attributes')
          .delete()
          .eq('product_id', productId);
      }
      
      // 3. 保存 SKU 数据（销售定价等）
      if (productSkus.length > 0) {
        for (const sku of productSkus) {
          if (sku.selling_price !== undefined) {
            await supabase
              .from('product_skus')
              .update({ selling_price: sku.selling_price })
              .eq('id', sku.id);
          }
        }
      }
      
      setSaveSuccess(true);
      setIsDirty(false);
      setTimeout(() => setSaveSuccess(false), 2000);
      await loadProduct(); // 重新加载产品数据
      
      console.log('[Product Save] Save completed, reloaded product specs:', product.specs);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  // 保存并上架
  async function handleSaveAndPublish() {
    if (!product || selectedSites.length === 0) return;
    setPublishing(true);
    setSaveError(null);
    try {
      // 1. 保存产品基本信息
      const saveRes = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, updated_at: new Date().toISOString() }),
      });
      if (!saveRes.ok) throw new Error('保存失败');

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
        
        if (attrsError) throw attrsError;
      }

      // 3. 创建站点视图并发布
      const siteViewErrors: string[] = [];
      for (const site of selectedSites) {
        const res = await fetch(`/api/v1/admin/products/${productId}/site-view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ site_code: site, publish_status: 'published', is_enabled: true }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          siteViewErrors.push(`${site}: ${err.error || res.statusText}`);
        }
      }
      if (siteViewErrors.length > 0) throw new Error(`站点视图创建失败：${siteViewErrors.join(', ')}`);

      // 4. 更新产品状态为已发布
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', productId);
      if (updateError) throw updateError;

      // 5. 记录审计日志
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'product',
        action: 'publish',
        target_type: 'product',
        target_id: productId,
        target_name: product.name,
        changes_summary: `上架产品：${product.name}，站点：${selectedSites.join(', ').toUpperCase()}`,
      });

      setShowPublishDialog(false);
      setIsDirty(false);
      await loadProduct();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '上架失败');
    } finally {
      setPublishing(false);
    }
  }

  // AI 翻译
  async function handleTranslate() {
    if (!product) return;
    setTranslating(true);
    setTranslateError(null);
    try {
      const res = await fetch('/api/products/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '翻译失败');
      }
      setTranslateSuccess(true);
      setTimeout(() => setTranslateSuccess(false), 3000);
      await loadProduct();
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : '翻译失败');
      setTimeout(() => setTranslateError(null), 5000);
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
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '批准失败');
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
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '拒绝失败');
    } finally {
      setSaving(false);
    }
  }

  // 下架
  async function handleOfflineFromSite(siteCode: string) {
    if (!confirm(`确定要从 ${siteCode === 'cn' ? '中国站' : '国际站'} 下架这个产品吗？`)) return;
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
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '下架失败');
      setTimeout(() => setSaveError(null), 3000);
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
          <Button variant="secondary" onClick={handleTranslate} loading={translating} disabled={isReadOnly}
            className={translateSuccess ? '!bg-emerald-500 !text-white' : '!bg-purple-600 hover:!bg-purple-500 !text-white'}>
            {translating ? 'AI 翻译中...' : translateSuccess ? '翻译完成 ✓' : 'AI 补全翻译'}
          </Button>
          {(product.status === 'pending_review' || product.status === 'Pending') && (
            <>
              <Button variant="secondary" onClick={handleApprove} loading={saving} className="!bg-green-600 hover:!bg-green-500 !text-white">✓ 通过</Button>
              <Button variant="secondary" onClick={handleReject} loading={saving} className="!bg-red-600 hover:!bg-red-500 !text-white">✕ 拒绝</Button>
            </>
          )}
          {!isReadOnly && (
            <Button onClick={handleSave} loading={saving} className={saveSuccess ? '!bg-green-500' : ''}>
              {saving ? '保存中...' : saveSuccess ? '已保存 ✓' : '保存修改'}
            </Button>
          )}
          {(product.status === 'pending_review' || product.status === 'Pending' || product.status === 'rejected' || product.status === 'Rejected' || product.status === 'draft' || product.status === 'Draft') && (
            <Button onClick={() => setShowPublishDialog(true)} className="!bg-emerald-600 hover:!bg-emerald-500 !text-white">保存并上架</Button>
          )}
        </div>
      </div>

      {(saveError || translateError) && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">{saveError || translateError}</div>
      )}

      {isReadOnly && (
        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>此产品已发布，当前为只读模式。如需修改，请先下架产品。</span>
        </div>
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
          { id: 'pricing', label: '价格与库存', icon: '💰' },
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
                <input type="text" value={getLocalizedValue('name')} onChange={(e) => setLocalizedValue('name', e.target.value)} disabled={isReadOnly}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">品牌 Brand</label>
                <input type="text" value={editForm.brand || ''} onChange={(e) => { setEditForm(prev => ({ ...prev, brand: e.target.value })); setIsDirty(true); }} disabled={isReadOnly}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                商品描述 ({editLang === publishLang ? `${editLang} - 源` : editLang})
              </label>
              <textarea value={getLocalizedValue('description')} onChange={(e) => setLocalizedValue('description', e.target.value)} disabled={isReadOnly} rows={4}
                className="w-full min-h-[100px] px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                商品详情 ({editLang === publishLang ? `${editLang} - 源` : editLang})
              </label>
              {editForm.rich_description ? (
                <div
                  className="w-full min-h-[200px] px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: getLocalizedValue('rich_description') || editForm.rich_description }}
                />
              ) : (
                <div className="w-full min-h-[100px] px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-400 italic">
                  暂无商品详情
                </div>
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
                <input type="text" value={editForm.image_url} onChange={(e) => { setEditForm(prev => ({ ...prev, image_url: e.target.value })); setIsDirty(true); }} disabled={isReadOnly} placeholder="图片 URL"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">专科分类 Specialty</label>
              <input type="text" value={editForm.specialty || ''} onChange={(e) => { setEditForm(prev => ({ ...prev, specialty: e.target.value })); setIsDirty(true); }} disabled={isReadOnly} placeholder="例如：Orthodontics, Oral Surgery"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" />
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
                        setEditForm(prev => ({ ...prev, category_id: categoryId, subcategory_id: '' })); 
                        setIsDirty(true); 
                      }} 
                      disabled={isReadOnly}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
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
                        setEditForm(prev => ({ ...prev, subcategory_id: e.target.value })); 
                        setIsDirty(true); 
                      }} 
                      disabled={isReadOnly || !editForm.category_id}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
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

      {/* Section 3: 价格与库存 */}
      {activeTab === 'pricing' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">💰</span> 价格与库存
          </h4>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">定价模式</label>
                  <select value={editForm.pricing_mode || 'fixed'} onChange={(e) => { setEditForm(prev => ({ ...prev, pricing_mode: e.target.value })); setIsDirty(true); }} disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50">
                    <option value="fixed">固定价格</option>
                    <option value="inquiry">询价模式</option>
                  </select>
                </div>
                {editForm.pricing_mode === 'fixed' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">供货价 (¥)</label>
                      <input type="number" value={editForm.price || ''} onChange={(e) => { setEditForm(prev => ({ ...prev, price: Number(e.target.value) })); setIsDirty(true); }} disabled={isReadOnly}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">库存数量</label>
                      <input type="number" value={editForm.stock_quantity || ''} onChange={(e) => { setEditForm(prev => ({ ...prev, stock_quantity: Number(e.target.value) })); setIsDirty(true); }} disabled={isReadOnly}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 外贸销售信息 */}
            <div className="border-t pt-6">
              <h5 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-lg">🌍</span> 外贸销售信息
              </h5>
              <div className="space-y-4">
                {/* 产品重量 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">产品重量</label>
                    <input type="number" step="0.01" min="0" value={editForm.weight || ''} onChange={(e) => { setEditForm(prev => ({ ...prev, weight: Number(e.target.value) })); setIsDirty(true); }} disabled={isReadOnly}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">重量单位</label>
                    <select value={editForm.weight_unit || 'g'} onChange={(e) => { setEditForm(prev => ({ ...prev, weight_unit: e.target.value })); setIsDirty(true); }} disabled={isReadOnly}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50">
                      <option value="g">克 (g)</option>
                      <option value="kg">千克 (kg)</option>
                      <option value="lb">磅 (lb)</option>
                    </select>
                  </div>
                </div>

                {/* 价格信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">建议销售价 (¥)</label>
                    <input type="number" step="0.01" min="0" value={editForm.suggested_retail_price || ''} onChange={(e) => { setEditForm(prev => ({ ...prev, suggested_retail_price: Number(e.target.value) })); setIsDirty(true); }} disabled={isReadOnly}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="可选" />
                    <p className="mt-1 text-xs text-slate-500">供应商建议的零售价格</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">销售定价 (¥) *</label>
                    <input type="number" step="0.01" min="0" value={editForm.selling_price || ''} onChange={(e) => { setEditForm(prev => ({ ...prev, selling_price: Number(e.target.value) })); setIsDirty(true); }} disabled={isReadOnly}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm focus:border-emerald-500 outline-none disabled:opacity-50 ${
                        editForm.selling_price && editForm.price && editForm.selling_price < editForm.price ? 'border-red-500 bg-red-50' : 'border-slate-200/50'
                      }`} placeholder="0.00" />
                    <p className="mt-1 text-xs text-slate-500">最终商城售价，不能低于供货价</p>
                    {editForm.selling_price && editForm.price && editForm.selling_price < editForm.price && (
                      <p className="mt-1 text-xs text-red-600">⚠️ 销售定价不能低于供货价</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800">
                💡 <strong>提示：</strong>如果此商品有多个规格（如不同颜色、尺寸），请在 <button onClick={() => setActiveTab('variants')} className="underline font-bold">规格与 SKU</button> 标签页中设置多规格价格和库存。
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Section 4: 规格与 SKU */}
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
                  disabled={isReadOnly}
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
                        disabled={isReadOnly}
                        placeholder="规格名称（如：颜色、尺寸、型号）"
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                      />
                      <button 
                        onClick={() => {
                          const newAttrs = variantAttributes.filter((_, i) => i !== idx);
                          setVariantAttributes(newAttrs);
                          setIsDirty(true);
                        }}
                        disabled={isReadOnly}
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
                        disabled={isReadOnly}
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
                {variantAttributes.length > 0 && (
                  <button className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                    生成 SKU
                  </button>
                )}
              </div>
              {productSkus.length > 0 ? (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">SKU 编码</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">规格组合</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">供货价</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">建议零售价</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">销售定价</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">重量</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">库存</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productSkus.map((sku) => (
                        <tr key={sku.id}>
                          <td className="px-4 py-3 text-slate-900">{sku.sku_code}</td>
                          <td className="px-4 py-3">
                            {sku.attribute_combination && Object.keys(sku.attribute_combination).length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {Object.entries(sku.attribute_combination).map(([key, value]) => (
                                  <span key={key} className="px-2 py-1 bg-slate-100 rounded text-xs">
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">默认SKU</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-900">¥{sku.price}</td>
                          <td className="px-4 py-3 text-slate-500">{sku.suggested_retail_price ? `¥${sku.suggested_retail_price}` : '-'}</td>
                          <td className="px-4 py-3">
                            <input type="number" step="0.01" min="0" value={sku.selling_price || ''}
                              onChange={(e) => {
                                const updatedSkus = productSkus.map(s => s.id === sku.id ? {...s, selling_price: parseFloat(e.target.value) || null} : s);
                                setProductSkus(updatedSkus);
                                setIsDirty(true);
                              }}
                              className="w-20 px-2 py-1 border rounded text-sm"
                              placeholder="定价"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {sku.weight ? `${sku.weight}${sku.weight_unit || 'g'}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-900">{sku.stock_quantity ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-400 mb-3">暂无 SKU 数据</p>
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
              <textarea value={JSON.stringify(editForm.specs || {}, null, 2)} onChange={(e) => {
                try { const specs = JSON.parse(e.target.value); setEditForm(prev => ({ ...prev, specs })); setIsDirty(true); } catch { } }} disabled={isReadOnly} rows={10}
                  className="w-full min-h-[200px] px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm font-mono text-slate-900 focus:border-emerald-500 outline-none resize-none disabled:opacity-50"
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
                <input type="text" value={editForm.focus_keyword || ''} onChange={(e) => { setEditForm(prev => ({ ...prev, focus_keyword: e.target.value })); setIsDirty(true); }} disabled={isReadOnly}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="例如：兽用手术器械，宠物医疗耗材" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Meta 标题</label>
                <input type="text" value={editForm.meta_title || ''} onChange={(e) => { setEditForm(prev => ({ ...prev, meta_title: e.target.value })); setIsDirty(true); }} disabled={isReadOnly} maxLength={60}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50" placeholder="搜索引擎结果中显示的标题" />
                <p className="mt-1 text-xs text-slate-500">建议长度：50-60 个字符，当前长度：{editForm.meta_title?.length || 0}</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Meta 描述</label>
                <textarea value={editForm.meta_description || ''} onChange={(e) => { setEditForm(prev => ({ ...prev, meta_description: e.target.value })); setIsDirty(true); }} disabled={isReadOnly} maxLength={160} rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none disabled:opacity-50" placeholder="搜索引擎结果中显示的产品描述" />
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
                        setEditForm(prev => ({ ...prev, faq: newFaq }));
                        setIsDirty(true);
                      }} disabled={isReadOnly} className="text-red-600 hover:text-red-800 p-1">
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
                          setEditForm(prev => ({ ...prev, faq: newFaq }));
                          setIsDirty(true);
                        }} disabled={isReadOnly}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="客户可能会问的问题" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">回答</label>
                        <textarea value={faq.answer || ''} onChange={(e) => {
                          const newFaq = [...editForm.faq];
                          newFaq[idx].answer = e.target.value;
                          setEditForm(prev => ({ ...prev, faq: newFaq }));
                          setIsDirty(true);
                        }} disabled={isReadOnly} rows={3}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="详细、专业的回答" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => {
                setEditForm(prev => ({ ...prev, faq: [...(prev.faq || []), { question: '', answer: '' }] }));
                setIsDirty(true);
              }} disabled={isReadOnly}
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
                  const isPublished = product.site_views?.some(sv => sv.site_code === site.code && sv.publish_status === 'published');
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
                          <button onClick={() => { setSelectedSites([site.code]); handleSaveAndPublish(); }} disabled={isReadOnly}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700">
                            发布
                          </button>
                        ) : (
                          <button onClick={() => handleOfflineFromSite(site.code)} disabled={isReadOnly}
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
    </div>
  );
}
