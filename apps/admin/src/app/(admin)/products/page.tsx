'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ToastContainer, useToast } from '@/components/ui';
import DataTable, { Column, SortConfig } from '@/components/DataTable';
import ProductFilterPanel, { ProductFilterState } from '@/components/ProductFilterPanel';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  pricing_mode: 'fixed' | 'inquiry';
  stock_quantity: number;
  status: string;
  supplier_id?: string;
  image_url?: string;
  brand?: string;
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
  offline: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
  pending_review: { label: '待审核', className: 'bg-amber-100 text-amber-600' },
  approved: { label: '已通过', className: 'bg-emerald-100 text-emerald-600' },
  rejected: { label: '已拒绝', className: 'bg-red-100 text-red-600' },
  published: { label: '已发布', className: 'bg-blue-100 text-blue-600' },
  offline: { label: '已下架', className: 'bg-gray-100 text-gray-600' },
};

const PAGE_SIZE = 20;
const MAX_BATCH_SIZE = 50;

export default function AdminProductsPage() {
  const router = useRouter();
  const { toasts, removeToast, success, error: showError } = useToast();

  // Supabase client - createClient() returns a singleton, so we can call it directly
  const supabase = createClient();

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0, pending_review: 0, approved: 0, published: 0, rejected: 0, offline: 0,
  });

  // Filter & search state
  const [filter, setFilter] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<ProductFilterState>({
    status: '', supplier_id: '', site_code: '',
  });
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Modal state
  const [rejectModal, setRejectModal] = useState<{ product: Product; reason: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [offlineConfirm, setOfflineConfirm] = useState<{ product: Product; siteCode: 'cn' | 'intl' } | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{ action: string; siteCodes?: ('cn' | 'intl')[] } | null>(null);

  // Track refresh count to trigger reloads
  const [refreshCount, setRefreshCount] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchKeyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Load all data when filters/page change
  useEffect(() => {
    let isCancelled = false;
    let loadingTimeout = null;

    async function fetchData() {
      setLoading(true);
      try {
        // Load status counts
        const [allRes, pendingRes, approvedRes, publishedRes, rejectedRes, offlineRes] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending_review').is('deleted_at', null),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'approved').is('deleted_at', null),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published').is('deleted_at', null),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'rejected').is('deleted_at', null),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'offline').is('deleted_at', null),
        ]);

        if (isCancelled) return;

        setStatusCounts({
          all: allRes.count || 0,
          pending_review: pendingRes.count || 0,
          approved: approvedRes.count || 0,
          published: publishedRes.count || 0,
          rejected: rejectedRes.count || 0,
          offline: offlineRes.count || 0,
        });

        // Load products
        let query = supabase
          .from('products')
          .select(`
            *,
            supplier:suppliers(company_name),
            site_views:product_site_views(site_code, publish_status, is_enabled)
          `, { count: 'exact' })
          .is('deleted_at', null)
          .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        if (advancedFilters.status) {
          query = query.eq('status', advancedFilters.status);
        }
        if (advancedFilters.site_code) {
          query = query.contains('published_sites', { [advancedFilters.site_code]: true });
        }

        if (debouncedSearch.trim()) {
          const keyword = debouncedSearch.trim();
          query = query.or(`name.ilike.%${keyword}%,sku.ilike.%${keyword}%,brand.ilike.%${keyword}%`);
        }

        if (sortConfig) {
          query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        const { data, error, count } = await query;
        if (error) throw error;
        if (isCancelled) return;

        console.log('Loaded products:', data?.length, 'count:', count);
        setProducts(data || []);
        setTotalCount(count || 0);
        setLoading(false);
      } catch (error) {
        if (isCancelled) return;
        console.error('Failed to load products:', error);
        showError('加载失败：' + (error as Error).message);
        setLoading(false);
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [filter, advancedFilters.status, advancedFilters.site_code, debouncedSearch, page, sortConfig?.key, sortConfig?.direction, refreshCount]);

  // Reset page when filters change (separate to avoid race conditions)
  const prevFilterRef = useRef(filter);
  const prevAdvFilterRef = useRef(advancedFilters);
  const prevSearchRef = useRef(debouncedSearch);

  useEffect(() => {
    if (
      prevFilterRef.current !== filter ||
      prevAdvFilterRef.current.status !== advancedFilters.status ||
      prevAdvFilterRef.current.site_code !== advancedFilters.site_code ||
      prevSearchRef.current !== debouncedSearch
    ) {
      prevFilterRef.current = filter;
      prevAdvFilterRef.current = advancedFilters;
      prevSearchRef.current = debouncedSearch;
      setPage(1);
      setSelectedKeys(new Set());
    }
  }, [filter, advancedFilters, debouncedSearch]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // === Optimistic Update Helpers ===

  // Refresh data (only used for bulk operations)
  const refresh = () => {
    setRefreshCount(c => c + 1);
    setSelectedKeys(new Set());
  };

  // Update a single product in the list without refetching
  const updateProductInList = useCallback((productId: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, ...updates } : p
    ));
  }, []);

  // Update status counts when status changes
  const updateStatusCounts = useCallback((fromStatus: string, toStatus: string) => {
    setStatusCounts(prev => {
      const newCounts = { ...prev };
      if (fromStatus && fromStatus !== 'all') {
        newCounts[fromStatus as keyof StatusCounts] = Math.max(0, (newCounts[fromStatus as keyof StatusCounts] || 0) - 1);
      }
      if (toStatus) {
        newCounts[toStatus as keyof StatusCounts] = (newCounts[toStatus as keyof StatusCounts] || 0) + 1;
      }
      return newCounts;
    });
  }, []);

  // === Action Handlers (with optimistic updates) ===

  const handleApprove = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    const oldStatus = product?.status || '';

    // Optimistic update
    updateProductInList(productId, { status: 'approved', rejection_reason: undefined });
    updateStatusCounts(oldStatus, 'approved');

    try {
      const { error } = await supabase
        .from('products')
        .update({ status: 'approved', rejection_reason: null, updated_at: new Date().toISOString() })
        .eq('id', productId);
      if (error) throw error;
      success('产品已通过审核');
    } catch (error) {
      // Revert on error
      updateProductInList(productId, { status: oldStatus });
      updateStatusCounts('approved', oldStatus);
      showError('操作失败');
    }
  };

  const handleReject = async () => {
    if (!rejectModal?.reason.trim()) {
      showError('请输入拒绝原因');
      return;
    }

    const { product, reason } = rejectModal;
    const oldStatus = product?.status || '';
    const oldReason = product?.rejection_reason;

    // Optimistic update
    updateProductInList(product.id, { status: 'rejected', rejection_reason: reason });
    updateStatusCounts(oldStatus, 'rejected');

    try {
      const { error } = await supabase
        .from('products')
        .update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', product.id);
      if (error) throw error;
      setRejectModal(null);
      success('产品已拒绝');
    } catch (error) {
      // Revert on error
      updateProductInList(product.id, { status: oldStatus, rejection_reason: oldReason });
      updateStatusCounts('rejected', oldStatus);
      showError('操作失败');
    }
  };

  const handlePublish = async (productId: string, siteCode: 'cn' | 'intl') => {
    const product = products.find(p => p.id === productId);
    const oldStatus = product?.status || '';
    const oldSiteViews = product?.site_views ? [...product.site_views] : [];

    // Optimistic update - update site_views
    const newSiteViews = [...(product?.site_views || [])];
    const existingIndex = newSiteViews.findIndex(sv => sv.site_code === siteCode);
    if (existingIndex >= 0) {
      newSiteViews[existingIndex] = { ...newSiteViews[existingIndex], publish_status: 'published', is_enabled: true };
    } else {
      newSiteViews.push({ site_code: siteCode, publish_status: 'published', is_enabled: true });
    }

    const newStatus = 'published';
    updateProductInList(productId, { status: newStatus, site_views: newSiteViews });
    if (oldStatus !== 'published') {
      updateStatusCounts(oldStatus, 'published');
    }

    try {
      // First update product_site_views
      const { error: siteViewError } = await supabase.from('product_site_views').upsert({
        product_id: productId, site_code: siteCode,
        publish_status: 'published', is_enabled: true, published_at: new Date().toISOString()
      }, { onConflict: 'product_id,site_code' });
      if (siteViewError) throw siteViewError;

      // Then update product status if needed
      if (oldStatus !== 'published') {
        const { error: productError } = await supabase.from('products')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', productId);
        if (productError) throw productError;
      }

      success(`已发布到${siteCode === 'cn' ? '中国站' : '国际站'}`);
    } catch (error) {
      // Revert on error
      updateProductInList(productId, { status: oldStatus, site_views: oldSiteViews });
      if (oldStatus !== 'published') {
        updateStatusCounts('published', oldStatus);
      }
      showError('发布失败');
    }
  };

  const handleOffline = async () => {
    if (!offlineConfirm) return;
    const { product, siteCode } = offlineConfirm;

    const oldSiteViews = product?.site_views ? [...product.site_views] : [];

    // Optimistic update
    const newSiteViews = (product?.site_views || []).map(sv =>
      sv.site_code === siteCode
        ? { ...sv, publish_status: 'offline', is_enabled: false }
        : sv
    );

    updateProductInList(product.id, { site_views: newSiteViews });

    try {
      const { error } = await supabase.from('product_site_views')
        .update({ publish_status: 'offline', is_enabled: false })
        .eq('product_id', product.id).eq('site_code', siteCode);
      if (error) throw error;

      success(`已从${siteCode === 'cn' ? '中国站' : '国际站'}下架`);
    } catch (error) {
      // Revert on error
      updateProductInList(product.id, { site_views: oldSiteViews });
      showError('下架失败');
    }
    setOfflineConfirm(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    const oldStatus = deleteConfirm.status || '';
    const deletedProduct = deleteConfirm;

    // Optimistic update - remove from list
    setProducts(prev => prev.filter(p => p.id !== deleteConfirm.id));
    setTotalCount(prev => Math.max(0, prev - 1));
    setStatusCounts(prev => ({
      ...prev,
      all: Math.max(0, prev.all - 1),
      [oldStatus]: Math.max(0, (prev[oldStatus as keyof StatusCounts] || 0) - 1),
    }));

    try {
      const res = await fetch(`/api/v1/admin/products/${deleteConfirm.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDeleteConfirm(null);
      success('产品已删除');
    } catch (error) {
      // Restore on error
      setProducts(prev => [...prev, deletedProduct].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setTotalCount(prev => prev + 1);
      setStatusCounts(prev => ({
        ...prev,
        all: prev.all + 1,
        [oldStatus]: (prev[oldStatus as keyof StatusCounts] || 0) + 1,
      }));
      setDeleteConfirm(null);
      showError('删除失败：' + (error as Error).message);
    }
  };

  // === Bulk Actions ===

  const handleBulkAction = async () => {
    if (!bulkConfirm) return;
    const { action, siteCodes } = bulkConfirm;

    if (selectedKeys.size === 0) {
      showError('请选择产品');
      return;
    }
    if (selectedKeys.size > MAX_BATCH_SIZE) {
      showError(`最多选择${MAX_BATCH_SIZE}条产品`);
      return;
    }

    try {
      const res = await fetch('/api/v1/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          product_ids: Array.from(selectedKeys),
          site_codes: siteCodes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBulkConfirm(null);
      refresh();
      success(`成功${action === 'approve' ? '通过' : action === 'reject' ? '拒绝' : action === 'publish' ? '发布' : action === 'offline' ? '下架' : '删除'} ${data.affected} 条产品`);
    } catch (error) {
      showError('操作失败：' + (error as Error).message);
    }
  };

  // === Export ===

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    if (debouncedSearch) params.set('search', debouncedSearch);

    window.open(`/api/v1/admin/products/export?${params.toString()}`, '_blank');
  };

  // === Helper Functions ===

  const isPublishedToSite = (product: Product, siteCode: string): boolean => {
    // 必须在 site_views 中找到对应站点的 published 状态才认为已发布
    // 不能仅凭 product.status 判断，因为产品可能只发布到部分站点
    return product.site_views?.some(sv => sv.site_code === siteCode && sv.publish_status === 'published' && sv.is_enabled === true) ?? false;
  };

  // === Table Columns ===

  const columns: Column<Product>[] = useMemo(() => [
    {
      key: 'name',
      header: '产品',
      render: (_, product) => (
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div>
            <p className="font-medium text-slate-900">{product.name}</p>
            <p className="text-xs text-slate-500">{product.brand ? `${product.brand} · ` : ''}SKU: {product.sku || '-'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: '供应商',
      hideOnMobile: true,
      render: (_, product) => product.supplier?.company_name || '-',
    },
    {
      key: 'price',
      header: '价格/库存',
      render: (_, product) => (
        <div>
          {product.pricing_mode === 'fixed' ? (
            <span className="font-medium">¥{product.price?.toLocaleString()}</span>
          ) : (
            <span className="text-slate-500">询价</span>
          )}
          <p className="text-xs text-slate-400">库存: {product.stock_quantity ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (_, product) => (
        <div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[product.status]?.className || 'bg-gray-100 text-gray-600'}`}>
            {statusConfig[product.status]?.label || product.status}
          </span>
          {product.rejection_reason && (
            <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={product.rejection_reason}>
              {product.rejection_reason}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'site_views',
      header: '发布站点',
      hideOnMobile: true,
      render: (_, product) => (
        <div className="flex gap-1">
          <span className={`px-2 py-1 text-xs rounded-full ${isPublishedToSite(product, 'cn') ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
            中国站
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${isPublishedToSite(product, 'intl') ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
            国际站
          </span>
        </div>
      ),
    },
  ], []);

  // === Row Actions ===

  const renderRowActions = (product: Product) => {
    // Normalize status for comparison (handle case inconsistencies)
    const status = product.status?.toLowerCase() || '';
    
    // Check if product is online on each site
    const isOnlineCN = isPublishedToSite(product, 'cn');
    const isOnlineINTL = isPublishedToSite(product, 'intl');

    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => router.push(`/products/${product.id}`)}
          className="px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-md"
        >
          编辑
        </button>

        {/* Pending Review: Show Approve and Reject */}
        {status === 'pending_review' && (
          <>
            <button 
              onClick={() => handleApprove(product.id)} 
              className="px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-md"
            >
              通过
            </button>
            <button 
              onClick={() => setRejectModal({ product, reason: '' })} 
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
            >
              拒绝
            </button>
          </>
        )}

        {/* Approved: Show Publish buttons */}
        {status === 'approved' && (
          <>
            <button 
              onClick={() => handlePublish(product.id, 'cn')} 
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md"
            >
              发布CN
            </button>
            <button 
              onClick={() => handlePublish(product.id, 'intl')} 
              className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-md"
            >
              发布INTL
            </button>
          </>
        )}

        {/* Published: Show Online/Offline toggle for each site */}
        {status === 'published' && (
          <>
            {isOnlineCN ? (
              <button 
                onClick={() => setOfflineConfirm({ product, siteCode: 'cn' })} 
                className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-md"
              >
                下架CN
              </button>
            ) : (
              <button 
                onClick={() => handlePublish(product.id, 'cn')} 
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md"
              >
                发布CN
              </button>
            )}
            {isOnlineINTL ? (
              <button 
                onClick={() => setOfflineConfirm({ product, siteCode: 'intl' })} 
                className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-md"
              >
                下架INTL
              </button>
            ) : (
              <button 
                onClick={() => handlePublish(product.id, 'intl')} 
                className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-md"
              >
                发布INTL
              </button>
            )}
          </>
        )}

        {/* Offline: Show Republish buttons */}
        {status === 'offline' && (
          <>
            <button 
              onClick={() => handlePublish(product.id, 'cn')} 
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md"
            >
              发布CN
            </button>
            <button 
              onClick={() => handlePublish(product.id, 'intl')} 
              className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-md"
            >
              发布INTL
            </button>
          </>
        )}

        {/* Rejected: Show Re-submit for review */}
        {status === 'rejected' && (
          <button 
            onClick={() => handleApprove(product.id)} 
            className="px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-md"
          >
            重新通过
          </button>
        )}

        <button 
          onClick={() => setDeleteConfirm(product)} 
          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
        >
          删除
        </button>
      </div>
    );
  };

  // === Render ===

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="max-w-[1600px] mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">产品管理</h1>
            <p className="text-slate-500 mt-1">管理所有产品，包括审核、发布、下架和删除</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              导出 CSV
            </button>
            <button
              onClick={() => router.push('/products/batch-import')}
              className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              批量导入
            </button>
            <button
              onClick={() => router.push('/products/new')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              添加产品
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {[
            { key: 'all', label: '全部', count: statusCounts.all },
            { key: 'pending_review', label: '待审核', count: statusCounts.pending_review },
            { key: 'approved', label: '已通过', count: statusCounts.approved },
            { key: 'published', label: '已发布', count: statusCounts.published },
            { key: 'offline', label: '已下架', count: statusCounts.offline },
            { key: 'rejected', label: '已拒绝', count: statusCounts.rejected },
          ].map((stat) => (
            <button
              key={stat.key}
              onClick={() => { setFilter(stat.key); setSelectedKeys(new Set()); }}
              className={`p-4 rounded-xl border text-left transition-all ${filter === stat.key ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300'}`}
            >
              <p className="text-2xl font-bold text-slate-900">{stat.count}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索产品名称、SKU、品牌..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ProductFilterPanel
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            onReset={() => setAdvancedFilters({ status: '', supplier_id: '', site_code: '' })}
            isOpen={filterPanelOpen}
            onToggle={() => setFilterPanelOpen(!filterPanelOpen)}
          />
        </div>

        {/* Bulk Action Bar */}
        {selectedKeys.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-4">
            <span className="text-sm font-medium text-blue-800">
              已选择 <strong>{selectedKeys.size}</strong> 条产品
            </span>
            <div className="flex gap-2">
              {filter === 'pending_review' && (
                <>
                  <button onClick={() => setBulkConfirm({ action: 'approve' })} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                    批量通过
                  </button>
                  <button onClick={() => setBulkConfirm({ action: 'reject' })} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
                    批量拒绝
                  </button>
                </>
              )}
              {(filter === 'approved' || filter === 'all') && (
                <button onClick={() => setBulkConfirm({ action: 'publish', siteCodes: ['cn', 'intl'] })} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                  批量发布
                </button>
              )}
              {filter === 'published' && (
                <button onClick={() => setBulkConfirm({ action: 'offline', siteCodes: ['cn', 'intl'] })} className="px-3 py-1.5 bg-slate-600 text-white text-sm rounded-md hover:bg-slate-700">
                  批量下架
                </button>
              )}
              <button onClick={() => setBulkConfirm({ action: 'delete' })} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
                批量删除
              </button>
              <button onClick={() => setSelectedKeys(new Set())} className="px-3 py-1.5 text-slate-600 text-sm rounded-md hover:bg-slate-100">
                取消选择
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <DataTable
            columns={columns}
            data={products}
            keyField="id"
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            rowActions={renderRowActions}
            loading={loading}
            emptyMessage="暂无产品数据"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-500">
                显示 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalCount)} 条，共 {totalCount} 条
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-slate-100">
                  上一页
                </button>
                <span className="text-sm text-slate-600">第 {page} / {totalPages} 页</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-slate-100">
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">拒绝产品</h3>
            <p className="text-sm text-slate-600 mb-4">产品: {rejectModal.product.name}</p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="请输入拒绝原因..."
              className="w-full p-3 border border-slate-200 rounded-lg mb-4"
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">确认拒绝</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">确认删除</h3>
            </div>
            <p className="text-sm text-slate-600 mb-2">确定要删除以下产品吗？此操作不可恢复。</p>
            <p className="text-sm font-medium text-slate-800 mb-6">产品：{deleteConfirm.name}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Confirm */}
      {offlineConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">确认下架</h3>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              确定要从 <strong>{offlineConfirm.siteCode === 'cn' ? '中国站' : '国际站'}</strong> 下架该商品吗？
            </p>
            <p className="text-sm font-medium text-slate-800 mb-6">商品：{offlineConfirm.product.name}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOfflineConfirm(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button onClick={handleOffline} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">确认下架</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirm */}
      {bulkConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              确认{bulkConfirm.action === 'approve' ? '批量通过' : bulkConfirm.action === 'reject' ? '批量拒绝' : bulkConfirm.action === 'publish' ? '批量发布' : bulkConfirm.action === 'offline' ? '批量下架' : '批量删除'}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              将对 <strong className="text-slate-900">{selectedKeys.size}</strong> 条产品执行此操作，确定继续吗？
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBulkConfirm(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button onClick={handleBulkAction} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}