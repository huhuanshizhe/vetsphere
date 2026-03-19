'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  pricing_mode: 'fixed' | 'inquiry';
  stock_quantity: number;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Published';
  supplier_id?: string;
  image_url?: string;
  created_at: string;
  published_at?: string;
  rejection_reason?: string;
  supplier?: {
    company_name: string;
  };
  site_views?: Array<{
    site_code: string;
    publish_status: string;
    is_enabled: boolean;
  }>;
}

interface StatusCounts {
  all: number;
  pending_review: number;
  approved: number;
  published: number;
  rejected: number;
}

// 兼容两种状态值格式
function normalizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Draft': 'draft',
    'draft': 'draft',
    'Pending': 'pending_review',
    'pending_review': 'pending_review',
    'Approved': 'approved',
    'approved': 'approved',
    'Rejected': 'rejected',
    'rejected': 'rejected',
    'Published': 'published',
    'published': 'published',
  };
  return statusMap[status] || status;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
  Draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
  pending_review: { label: '待审核', className: 'bg-amber-100 text-amber-600' },
  Pending: { label: '待审核', className: 'bg-amber-100 text-amber-600' },
  approved: { label: '已通过', className: 'bg-emerald-100 text-emerald-600' },
  Approved: { label: '已通过', className: 'bg-emerald-100 text-emerald-600' },
  rejected: { label: '已拒绝', className: 'bg-red-100 text-red-600' },
  Rejected: { label: '已拒绝', className: 'bg-red-100 text-red-600' },
  published: { label: '已发布', className: 'bg-blue-100 text-blue-600' },
  Published: { label: '已发布', className: 'bg-blue-100 text-blue-600' },
};

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0,
    pending_review: 0,
    approved: 0,
    published: 0,
    rejected: 0,
  });

  // 加载状态统计（只查数量，很快）
  const loadStatusCounts = useCallback(async () => {
    try {
      const counts: StatusCounts = {
        all: 0,
        pending_review: 0,
        approved: 0,
        published: 0,
        rejected: 0,
      };

      // 并行查询各状态数量
      const [allRes, pendingRes, approvedRes, publishedRes, rejectedRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).in('status', ['pending_review', 'Pending']),
        supabase.from('products').select('id', { count: 'exact', head: true }).in('status', ['approved', 'Approved']),
        supabase.from('products').select('id', { count: 'exact', head: true }).in('status', ['published', 'Published']),
        supabase.from('products').select('id', { count: 'exact', head: true }).in('status', ['rejected', 'Rejected']),
      ]);

      counts.all = allRes.count || 0;
      counts.pending_review = pendingRes.count || 0;
      counts.approved = approvedRes.count || 0;
      counts.published = publishedRes.count || 0;
      counts.rejected = rejectedRes.count || 0;

      setStatusCounts(counts);
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  }, [supabase]);

  // 加载产品列表（分页）
  const loadProducts = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          supplier:suppliers(company_name),
          site_views:product_site_views(site_code, publish_status, is_enabled)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

      if (filter !== 'all') {
        const normalizedFilter = filter === 'pending_review' ? ['pending_review', 'Pending'] : [filter];
        query = query.in('status', normalizedFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to load products:', error);
      alert('加载失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [supabase, filter]);

  // 初始化加载
  useEffect(() => {
    loadStatusCounts();
    setPage(1);
    loadProducts(1);
  }, [filter]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 刷新当前页
  const refreshCurrentPage = useCallback(() => {
    loadStatusCounts();
    loadProducts(page);
  }, [page, loadProducts, loadStatusCounts]);

  const handleApprove = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          status: 'approved',
          rejection_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;
      refreshCurrentPage();
      alert('产品已通过审核');
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('操作失败');
    }
  };

  const handleReject = async (productId: string) => {
    if (!rejectionReason.trim()) {
      alert('请输入拒绝原因');
      return;
    }
    try {
      const { error } = await supabase
        .from('products')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;
      setRejectionReason('');
      setSelectedProduct(null);
      refreshCurrentPage();
      alert('产品已拒绝');
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('操作失败');
    }
  };

  const handlePublishToSite = async (productId: string, siteCode: 'cn' | 'intl') => {
    try {
      // Check if site view exists
      const { data: existing } = await supabase
        .from('product_site_views')
        .select('id')
        .eq('product_id', productId)
        .eq('site_code', siteCode)
        .single();

      if (existing) {
        // Update existing site view
        const { error } = await supabase
          .from('product_site_views')
          .update({
            publish_status: 'published',
            is_enabled: true,
            published_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create new site view
        const { error } = await supabase
          .from('product_site_views')
          .insert({
            product_id: productId,
            site_code: siteCode,
            publish_status: 'published',
            is_enabled: true,
            published_at: new Date().toISOString()
          });
        if (error) throw error;
      }

      // Update product status to published
      const { error: productError } = await supabase
        .from('products')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (productError) throw productError;

      refreshCurrentPage();
      alert(`已发布到 ${siteCode === 'cn' ? '中国站' : '国际站'}`);
    } catch (error) {
      console.error('Failed to publish:', error);
      alert('发布失败');
    }
  };

  const handleOfflineFromSite = async (productId: string, siteCode: 'cn' | 'intl') => {
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
      refreshCurrentPage();
      alert(`已从 ${siteCode === 'cn' ? '中国站' : '国际站'} 下架`);
    } catch (error) {
      console.error('Failed to offline:', error);
      alert('下架失败');
    }
  };

  // Helper to check if product is published to a site
  const isPublishedToSite = useCallback((product: Product, siteCode: string): boolean => {
    return product.site_views?.some(sv => sv.site_code === siteCode && sv.publish_status === 'published') || false;
  }, []);

  // 分页切换
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      loadProducts(newPage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">产品管理</h1>
            <p className="text-slate-500 mt-1">管理所有产品，包括审核、发布和上下架</p>
          </div>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
            添加产品
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { key: 'all', label: '全部', count: statusCounts.all },
            { key: 'pending_review', label: '待审核', count: statusCounts.pending_review },
            { key: 'approved', label: '已通过', count: statusCounts.approved },
            { key: 'published', label: '已发布', count: statusCounts.published },
            { key: 'rejected', label: '已拒绝', count: statusCounts.rejected },
          ].map((stat) => (
            <button
              key={stat.key}
              onClick={() => setFilter(stat.key)}
              className={`p-4 rounded-xl border text-left transition-all ${filter === stat.key ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'}`}
            >
              <p className="text-2xl font-bold">{stat.count}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-700">产品</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-700">供应商</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-700">价格/库存</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-700">状态</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-700">发布站点</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-200"></div>
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-slate-500">SKU: {product.sku || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{product.supplier?.company_name || '-'}</td>
                  <td className="px-6 py-4">
                    <div>
                      {product.pricing_mode === 'fixed' ? (
                        <span>¥{product.price?.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-500">询价</span>
                      )}
                      <p className="text-xs text-slate-400">库存: {product.stock_quantity ?? '-'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusConfig[product.status]?.className}`}>
                      {statusConfig[product.status]?.label}
                    </span>
                    {product.rejection_reason && (
                      <p className="text-xs text-red-500 mt-1">{product.rejection_reason}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {isPublishedToSite(product, 'cn') ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">中国站</span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-100 text-slate-400 text-xs rounded-full">中国站</span>
                      )}
                      {isPublishedToSite(product, 'intl') ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">国际站</span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-100 text-slate-400 text-xs rounded-full">国际站</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* 编辑/详情按钮 - 所有商品都显示 */}
                      <button 
                        onClick={() => router.push(`/products/${product.id}`)}
                        className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
                        title="查看/编辑产品详情"
                      >
                        编辑
                      </button>
                      
                      {/* 待审核状态 - 显示审核按钮 */}
                      {(product.status === 'pending_review' || product.status === 'Pending') && (
                        <>
                          <button 
                            onClick={() => handleApprove(product.id)}
                            className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm"
                            title="批准产品"
                          >
                            ✓ 通过
                          </button>
                          <button 
                            onClick={() => setSelectedProduct(product)}
                            className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors shadow-sm"
                            title="拒绝产品"
                          >
                            ✕ 拒绝
                          </button>
                        </>
                      )}
                      
                      {/* 已通过状态 - 显示发布按钮 */}
                      {product.status === 'approved' && (
                        <>
                          <button 
                            onClick={() => handlePublishToSite(product.id, 'cn')}
                            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            发布中国站
                          </button>
                          <button 
                            onClick={() => handlePublishToSite(product.id, 'intl')}
                            className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors shadow-sm"
                          >
                            发布国际站
                          </button>
                        </>
                      )}
                      
                      {/* 已发布状态 - 显示上下架按钮 */}
                      {product.status === 'published' && (
                        <>
                          {!isPublishedToSite(product, 'cn') ? (
                            <button 
                              onClick={() => handlePublishToSite(product.id, 'cn')}
                              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              发布中国站
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleOfflineFromSite(product.id, 'cn')}
                              className="px-4 py-1.5 bg-slate-500 text-white text-sm font-medium rounded-md hover:bg-slate-600 transition-colors shadow-sm"
                            >
                              下架中国站
                            </button>
                          )}
                          {!isPublishedToSite(product, 'intl') ? (
                            <button 
                              onClick={() => handlePublishToSite(product.id, 'intl')}
                              className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors shadow-sm"
                            >
                              发布国际站
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleOfflineFromSite(product.id, 'intl')}
                              className="px-4 py-1.5 bg-slate-500 text-white text-sm font-medium rounded-md hover:bg-slate-600 transition-colors shadow-sm"
                            >
                              下架国际站
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-500">
                显示 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalCount)} 条，共 {totalCount} 条
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  上一页
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 text-sm rounded-lg ${page === pageNum ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-slate-100'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">拒绝产品</h3>
            <p className="text-sm text-slate-600 mb-4">产品: {selectedProduct.name}</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="请输入拒绝原因..."
              className="w-full p-3 border border-slate-200 rounded-lg mb-4"
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button 
                onClick={() => handleReject(selectedProduct.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
