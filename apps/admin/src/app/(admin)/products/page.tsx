'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/admin';
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
}

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const supabase = createClient();
  
  const [products, setProducts] = useState<Product[]>([]);
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

  useEffect(() => {
    loadScenes();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [filterStatus, filterScene, searchKeyword, page]);

  async function loadScenes() {
    const { data } = await supabase
      .from('scene_categories')
      .select('code, name')
      .eq('is_active', true)
      .order('display_order');
    
    setScenes(data || []);
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
          <h1 className="text-2xl font-bold text-white">商品管理</h1>
          <p className="text-slate-400 mt-1">管理平台商品与设备</p>
        </div>
        <Button onClick={() => window.location.href = '/products/new'}>
          新建商品
        </Button>
      </div>

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
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">商品</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">品牌/型号</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">价格</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">浏览</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">推荐</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded bg-slate-700 flex-shrink-0 overflow-hidden">
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
                            <span className="font-medium text-white line-clamp-1">{product.name}</span>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {productTypeLabels[product.product_type] || product.product_type}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-slate-300">{product.brand || '-'}</div>
                          <div className="text-slate-500 text-xs">{product.model || '-'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white text-sm">
                        {formatPrice(product)}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {product.view_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="px-6 py-4">
                        {product.is_featured ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                            推荐
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setProductToFeature(product);
                                  setShowFeatureDialog(true);
                                }}
                              >
                                {product.is_featured ? '取消推荐' : '推荐'}
                              </Button>
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
              <div className="px-6 py-4 border-t border-slate-700/50">
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
