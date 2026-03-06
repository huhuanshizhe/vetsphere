'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/admin';
import { useSite } from '@/context/SiteContext';
import {
  Card,
  Button,
  Input,
  Select,
  StatusBadge,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  status: 'draft' | 'published' | 'offline';
  product_type: string;
  scene_code?: string;
  brand?: string;
  model?: string;
  price_min?: number;
  price_max?: number;
  cover_image_url?: string;
  is_featured: boolean;
  view_count: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
  site_views?: { site_code: string; publish_status: string; is_enabled: boolean }[];
}

interface ProductSiteView {
  id: string;
  product_id: string;
  site_code: string;
  is_enabled: boolean;
  publish_status: 'draft' | 'published' | 'offline';
  display_name?: string;
  slug_override?: string;
  display_order: number;
  is_featured: boolean;
  published_at?: string;
  product?: Product;
}

type ViewTab = 'base' | 'site';

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const supabase = createClient();
  const { currentSite } = useSite();
  
  const [viewTab, setViewTab] = useState<ViewTab>('base');
  const [products, setProducts] = useState<Product[]>([]);
  const [productSiteViews, setProductSiteViews] = useState<ProductSiteView[]>([]);
  const [scenes, setScenes] = useState<{code: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, featured: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterScene, setFilterScene] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // 弹窗状态
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [productToChange, setProductToChange] = useState<Product | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [dialogLoading, setDialogLoading] = useState(false);
  
  const [showFeatureDialog, setShowFeatureDialog] = useState(false);
  const [productToFeature, setProductToFeature] = useState<Product | null>(null);
  
  const [initLoading, setInitLoading] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState<string | null>(null);

  useEffect(() => {
    loadScenes();
  }, []);

  useEffect(() => {
    if (viewTab === 'base') {
      loadProducts();
    } else {
      loadProductSiteViews();
    }
  }, [filterStatus, filterScene, searchKeyword, page, viewTab, currentSite]);

  async function loadScenes() {
    const { data } = await supabase
      .from('scene_categories')
      .select('code, name')
      .eq('is_active', true)
      .order('display_order');
    
    setScenes(data || []);
  }

  async function loadProductSiteViews() {
    setLoading(true);
    try {
      let query = supabase
        .from('product_site_views')
        .select(`*, product:products(id, name, slug, status, product_type, brand, cover_image_url, price_min, price_max)`)
        .eq('site_code', currentSite)
        .order('display_order', { ascending: true });

      if (filterStatus) {
        query = query.eq('publish_status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProductSiteViews(data || []);
    } catch (error) {
      console.error('加载站点视图失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInitSiteView(productId: string) {
    setInitLoading(productId);
    try {
      const { error } = await supabase
        .from('product_site_views')
        .upsert({
          product_id: productId,
          site_code: currentSite,
          is_enabled: true,
          publish_status: 'draft',
        }, { onConflict: 'product_id,site_code' });

      if (error) throw error;
      loadProducts();
    } catch (error) {
      console.error('初始化站点视图失败:', error);
    } finally {
      setInitLoading(null);
    }
  }

  async function handleSiteViewPublish(siteViewId: string, action: 'published' | 'offline') {
    setPublishLoading(siteViewId);
    try {
      const updateData: any = { publish_status: action };
      if (action === 'published') updateData.published_at = new Date().toISOString();

      const { error } = await supabase
        .from('product_site_views')
        .update(updateData)
        .eq('id', siteViewId);

      if (error) throw error;
      loadProductSiteViews();
    } catch (error) {
      console.error('操作失败:', error);
    } finally {
      setPublishLoading(null);
    }
  }

  async function loadProducts() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);
      
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      
      if (filterScene) {
        query = query.eq('scene_code', filterScene);
      }
      
      if (searchKeyword) {
        query = query.or(`name.ilike.%${searchKeyword}%,slug.ilike.%${searchKeyword}%,brand.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setProducts(data || []);
      setTotal(count || 0);
      
      // Attach site view status
      const ids = (data || []).map(p => p.id);
      if (ids.length > 0) {
        const { data: views } = await supabase
          .from('product_site_views')
          .select('product_id, site_code, publish_status, is_enabled')
          .in('product_id', ids);
        
        if (views) {
          const viewMap: Record<string, any[]> = {};
          views.forEach(v => {
            if (!viewMap[v.product_id]) viewMap[v.product_id] = [];
            viewMap[v.product_id].push(v);
          });
          setProducts(prev => prev.map(p => ({ ...p, site_views: viewMap[p.id] || [] })));
        }
      }
      
      await loadStats();
    } catch (error) {
      console.error('加载商品列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const { count: totalCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);
    
    const { count: publishedCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'published');
    
    const { count: draftCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'draft');
    
    const { count: featuredCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('is_featured', true);
    
    setStats({
      total: totalCount || 0,
      published: publishedCount || 0,
      draft: draftCount || 0,
      featured: featuredCount || 0,
    });
  }

  // 变更状态
  async function handleChangeStatus() {
    if (!productToChange || !newStatus) return;
    
    setDialogLoading(true);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'published') {
        updateData.published_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productToChange.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'product',
        action: newStatus === 'published' ? 'publish' : 'offline',
        target_type: 'product',
        target_id: productToChange.id,
        target_name: productToChange.name,
        changes_summary: `${newStatus === 'published' ? '发布' : '下线'}商品: ${productToChange.name}`,
      });
      
      setShowStatusDialog(false);
      setProductToChange(null);
      setNewStatus('');
      loadProducts();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  // 切换推荐
  async function handleToggleFeature() {
    if (!productToFeature) return;
    
    setDialogLoading(true);
    try {
      const newFeatured = !productToFeature.is_featured;
      
      const { error } = await supabase
        .from('products')
        .update({ is_featured: newFeatured })
        .eq('id', productToFeature.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'product',
        action: newFeatured ? 'feature' : 'unfeature',
        target_type: 'product',
        target_id: productToFeature.id,
        target_name: productToFeature.name,
        changes_summary: `${newFeatured ? '设为推荐' : '取消推荐'}: ${productToFeature.name}`,
      });
      
      setShowFeatureDialog(false);
      setProductToFeature(null);
      loadProducts();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  const productTypeLabels: Record<string, string> = {
    equipment: '设备',
    consumable: '耗材',
    instrument: '器械',
    furniture: '家具',
    software: '软件',
  };

  // 格式化价格区间
  function formatPrice(product: Product) {
    if (product.price_min === null && product.price_max === null) {
      return '价格面议';
    }
    if (product.price_min === product.price_max) {
      return `¥${product.price_min?.toLocaleString()}`;
    }
    if (product.price_min && product.price_max) {
      return `¥${product.price_min?.toLocaleString()} - ¥${product.price_max?.toLocaleString()}`;
    }
    if (product.price_min) {
      return `¥${product.price_min?.toLocaleString()} 起`;
    }
    return `最高 ¥${product.price_max?.toLocaleString()}`;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">商品管理</h1>
          <p className="text-slate-500 mt-1">管理平台商品与设备</p>
        </div>
        <Button onClick={() => window.location.href = '/products/new'}>
          新建商品
        </Button>
      </div>

      {/* 视图切换 Tab */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setViewTab('base'); setPage(1); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewTab === 'base'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Base 资源库
        </button>
        <button
          onClick={() => { setViewTab('site'); setPage(1); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewTab === 'site'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {currentSite === 'cn' ? '🇨🇳 CN' : '🌐 INTL'} 站点视图
        </button>
      </div>

      {viewTab === 'base' ? (
        <>
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总商品数" value={stats.total} />
        <StatCard label="已发布" value={stats.published} />
        <StatCard label="草稿" value={stats.draft} />
        <StatCard label="推荐商品" value={stats.featured} />
      </div>

      {/* 筛选栏 */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索商品名称、品牌..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(1);
              }}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="w-full md:w-40">
            <Select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部状态' },
                { value: 'draft', label: '草稿' },
                { value: 'published', label: '已发布' },
                { value: 'offline', label: '已下线' },
              ]}
            />
          </div>
          <div className="w-full md:w-40">
            <Select
              value={filterScene}
              onChange={(e) => {
                setFilterScene(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部场景' },
                ...scenes.map(s => ({ value: s.code, label: s.name })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 商品列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : products.length === 0 ? (
          <EmptyState
            title="暂无商品"
            description="点击上方按钮创建第一个商品"
          />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">商品</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">品牌/型号</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">价格</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">浏览</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">站点视图</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded bg-slate-100 flex-shrink-0 overflow-hidden">
                            {product.cover_image_url ? (
                              <img src={product.cover_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-slate-900 line-clamp-1">{product.name}</span>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {productTypeLabels[product.product_type] || product.product_type}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-slate-600">{product.brand || '-'}</div>
                          <div className="text-slate-500 text-xs">{product.model || '-'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-900 text-sm">
                        {formatPrice(product)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {product.view_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5">
                          {(product.site_views || []).map(sv => (
                            <span key={sv.site_code} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              sv.publish_status === 'published' ? 'bg-emerald-500/20 text-emerald-400' :
                              sv.publish_status === 'offline' ? 'bg-red-500/20 text-red-400' :
                              'bg-slate-500/20 text-slate-500'
                            }`}>
                              {sv.site_code.toUpperCase()}
                            </span>
                          ))}
                          {(!product.site_views || product.site_views.length === 0) && (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => window.location.href = `/products/${product.id}`}
                          >
                            编辑
                          </Button>
                          {product.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setProductToChange(product);
                                setNewStatus('published');
                                setShowStatusDialog(true);
                              }}
                            >
                              发布
                            </Button>
                          )}
                          {product.status === 'published' && (
                            <>
                              {!(product.site_views || []).find(v => v.site_code === currentSite) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  loading={initLoading === product.id}
                                  onClick={() => handleInitSiteView(product.id)}
                                >
                                  初始化{currentSite.toUpperCase()}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setProductToChange(product);
                                  setNewStatus('offline');
                                  setShowStatusDialog(true);
                                }}
                              >
                                下线
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200/50">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>
        </>
      ) : (
        /* Site View Tab */
        <>
          <Card>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="搜索商品..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />
              </div>
              <div className="w-full md:w-40">
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { value: '', label: '全部状态' },
                    { value: 'draft', label: '草稿' },
                    { value: 'published', label: '已发布' },
                    { value: 'offline', label: '已下线' },
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card padding="none">
            {loading ? (
              <LoadingState />
            ) : productSiteViews.length === 0 ? (
              <EmptyState
                icon="🌐"
                title={`暂无 ${currentSite.toUpperCase()} 站点视图`}
                description="请先在 Base 资源库中为商品初始化站点视图"
              />
            ) : (
              <TableContainer>
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">商品</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">显示名称</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">排序</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">推荐</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {productSiteViews.map((sv) => (
                      <tr key={sv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-medium text-slate-900 line-clamp-1">{sv.product?.name || sv.product_id}</span>
                            <div className="text-xs text-slate-500">{sv.product?.slug}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {sv.display_name || <span className="text-slate-600">继承 Base</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{sv.display_order}</td>
                        <td className="px-6 py-4">
                          {sv.is_featured ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">推荐</span>
                          ) : (
                            <span className="text-slate-500 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            sv.publish_status === 'published' ? 'bg-emerald-500/20 text-emerald-400' :
                            sv.publish_status === 'offline' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-500/20 text-slate-500'
                          }`}>
                            {sv.publish_status === 'published' ? '已发布' : sv.publish_status === 'offline' ? '已下线' : '草稿'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sv.publish_status !== 'published' && (
                              <Button
                                size="sm"
                                loading={publishLoading === sv.id}
                                onClick={() => handleSiteViewPublish(sv.id, 'published')}
                              >
                                发布
                              </Button>
                            )}
                            {sv.publish_status === 'published' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={publishLoading === sv.id}
                                onClick={() => handleSiteViewPublish(sv.id, 'offline')}
                              >
                                下线
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            )}
          </Card>
        </>
      )}

      {/* 状态变更确认弹窗 */}
      <ConfirmDialog
        open={showStatusDialog}
        title={newStatus === 'published' ? '发布商品' : '下线商品'}
        message={
          newStatus === 'published'
            ? `确定要发布商品 "${productToChange?.name}" 吗？发布后用户即可访问。`
            : `确定要下线商品 "${productToChange?.name}" 吗？下线后用户将无法访问。`
        }
        confirmText={newStatus === 'published' ? '确认发布' : '确认下线'}
        onConfirm={handleChangeStatus}
        onCancel={() => {
          setShowStatusDialog(false);
          setProductToChange(null);
          setNewStatus('');
        }}
        loading={dialogLoading}
        danger={newStatus === 'offline'}
      />

      {/* 推荐确认弹窗 */}
      <ConfirmDialog
        open={showFeatureDialog}
        title={productToFeature?.is_featured ? '取消推荐' : '设为推荐'}
        message={
          productToFeature?.is_featured
            ? `确定要取消商品 "${productToFeature?.name}" 的推荐状态吗？`
            : `确定要将商品 "${productToFeature?.name}" 设为推荐吗？推荐商品将在首页展示。`
        }
        confirmText={productToFeature?.is_featured ? '取消推荐' : '确认推荐'}
        onConfirm={handleToggleFeature}
        onCancel={() => {
          setShowFeatureDialog(false);
          setProductToFeature(null);
        }}
        loading={dialogLoading}
      />
    </div>
  );
}
