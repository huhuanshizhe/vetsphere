'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ToastContainer, useToast } from '@/components/ui';
import DataTable, { Column } from '@/components/DataTable';

// ============================================================================
// Types
// ============================================================================

interface ProductSku {
  id: string;
  sku_code: string;
  price: number;
  selling_price: number | null;
  selling_price_usd: number | null;
  stock_quantity: number;
  is_active: boolean;
}

interface ProductCategory {
  id: string;
  name: string | null;
  name_en: string;
  level: number;
  parent_id: string | null;
}

interface Product {
  id: string;
  name: string;
  name_en: string | null;
  name_th: string | null;
  name_ja: string | null;
  sku_code: string | null;
  brand: string | null;
  brand_en: string | null;
  publish_language: string;
  status: string;
  image_url: string | null;
  pricing_mode: string;
  total_stock: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  rejection_reason: string | null;
  category_id: string | null;
  supplier_id: string | null;
  supplier_uuid: string | null;
  supplier?: { company_name: string } | null;
  site_views?: Array<{
    site_code: string;
    publish_status: string;
    is_enabled: boolean;
  }>;
  product_skus?: ProductSku[];
  category?: ProductCategory | null;
}

interface StatusCounts {
  all: number;
  draft: number;
  pending_review: number;
  approved: number;
  published: number;
  rejected: number;
  offline: number;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_TABS: { key: string; label: string; dotColor: string }[] = [
  { key: 'all', label: '全部', dotColor: 'bg-slate-400' },
  { key: 'draft', label: '草稿', dotColor: 'bg-slate-400' },
  { key: 'pending_review', label: '待审核', dotColor: 'bg-amber-400' },
  { key: 'approved', label: '已通过', dotColor: 'bg-emerald-400' },
  { key: 'published', label: '已发布', dotColor: 'bg-blue-400' },
  { key: 'rejected', label: '已拒绝', dotColor: 'bg-red-400' },
  { key: 'offline', label: '已下架', dotColor: 'bg-gray-400' },
];

const statusBadgeConfig: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
  pending_review: { label: '待审核', className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200' },
  approved: { label: '已通过', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' },
  rejected: { label: '已拒绝', className: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200' },
  published: { label: '已发布', className: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200' },
  offline: { label: '已下架', className: 'bg-gray-100 text-gray-600' },
};

const SORT_OPTIONS = [
  { value: 'created_desc', label: '最新创建' },
  { value: 'created_asc', label: '最早创建' },
  { value: 'updated_desc', label: '最近更新' },
  { value: 'name_asc', label: '名称 A-Z' },
  { value: 'name_desc', label: '名称 Z-A' },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const MAX_BATCH_SIZE = 50;

// ============================================================================
// Helper Functions
// ============================================================================

function getDisplayName(p: Product): string {
  switch (p.publish_language) {
    case 'en': return p.name_en || p.name || '(Unnamed)';
    case 'th': return p.name_th || p.name || '(Unnamed)';
    case 'ja': return p.name_ja || p.name || '(Unnamed)';
    default: return p.name || p.name_en || '(未命名)';
  }
}

function getDisplayBrand(p: Product): string | null {
  if (p.publish_language === 'en') return p.brand_en || p.brand || null;
  return p.brand || p.brand_en || null;
}

function getPricing(p: Product): { usd: number | null; cny: number | null; cost: number | null } {
  const skus = p.product_skus?.filter(s => s.is_active);
  if (!skus?.length) return { usd: null, cny: null, cost: null };
  const s = skus[0];
  return { usd: s.selling_price_usd ?? null, cny: s.selling_price ?? null, cost: s.price ?? null };
}

function getTotalStock(p: Product): number {
  const skus = p.product_skus?.filter(s => s.is_active);
  if (!skus?.length) return p.total_stock || 0;
  return skus.reduce((sum, s) => sum + (s.stock_quantity || 0), 0);
}

function getLanguages(p: Product): string[] {
  const langs: string[] = [];
  if (p.name) langs.push('中');
  if (p.name_en) langs.push('EN');
  if (p.name_th) langs.push('TH');
  if (p.name_ja) langs.push('JA');
  return langs;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  if (hrs < 24) return `${hrs}小时前`;
  if (days < 30) return `${days}天前`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isPublishedToSite(product: Product, siteCode: string): boolean {
  return product.site_views?.some(
    sv => sv.site_code === siteCode && sv.publish_status === 'published' && sv.is_enabled === true
  ) ?? false;
}

function isSelfOwned(product: Product): boolean {
  return !product.supplier_id && !(product.supplier as any)?.company_name;
}

// ============================================================================
// ActionDropdown Component
// ============================================================================

function ActionDropdown({ product, onEdit, onApprove, onReject, onPublish, onOffline, onDelete, onSubmitReview }: {
  product: Product;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPublish: (site: 'cn' | 'intl') => void;
  onOffline: (site: 'cn' | 'intl') => void;
  onDelete: () => void;
  onSubmitReview: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // Check if dropdown would overflow bottom of viewport
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 280; // approximate max height
      const top = spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom + 4;
      setPos({ top, right: window.innerWidth - rect.right });
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [open]);

  const status = product.status?.toLowerCase() || '';
  const isOnCN = isPublishedToSite(product, 'cn');
  const isOnINTL = isPublishedToSite(product, 'intl');

  const Item = ({ onClick, label, color = 'text-slate-700 hover:bg-slate-50', icon }: {
    onClick: () => void; label: string; color?: string; icon: React.ReactNode;
  }) => (
    <button
      onClick={() => { onClick(); setOpen(false); }}
      className={`w-full px-3.5 py-2 text-left text-sm flex items-center gap-2.5 transition-colors ${color}`}
    >
      <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>
      {label}
    </button>
  );

  const Divider = () => <div className="border-t border-slate-100 my-1" />;

  const iconEdit = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
  const iconCheck = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
  const iconX = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
  const iconGlobe = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  const iconBan = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
  const iconRefresh = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
  const iconTrash = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
  const iconSend = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
  const selfOwned = isSelfOwned(product);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="fixed w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[100]"
          style={{ top: pos.top, right: pos.right }}
        >
          <Item onClick={onEdit} icon={iconEdit} label="编辑" />

          {/* 草稿状态：自营可直接发布站点，供应商需提交审核 */}
          {status === 'draft' && selfOwned && (
            <>
              <Divider />
              {!isOnCN && <Item onClick={() => onPublish('cn')} icon={iconGlobe} label="发布中国站" color="text-blue-600 hover:bg-blue-50" />}
              {!isOnINTL && <Item onClick={() => onPublish('intl')} icon={iconGlobe} label="发布国际站" color="text-purple-600 hover:bg-purple-50" />}
            </>
          )}

          {status === 'draft' && !selfOwned && (
            <>
              <Divider />
              <Item onClick={onSubmitReview} icon={iconSend} label="提交审核" color="text-amber-600 hover:bg-amber-50" />
            </>
          )}

          {status === 'pending_review' && (
            <>
              <Divider />
              <Item onClick={onApprove} icon={iconCheck} label="通过审核" color="text-emerald-600 hover:bg-emerald-50" />
              <Item onClick={onReject} icon={iconX} label="拒绝" color="text-red-600 hover:bg-red-50" />
            </>
          )}

          {(status === 'approved' || status === 'published' || status === 'offline') && (
            <>
              <Divider />
              {!isOnCN && <Item onClick={() => onPublish('cn')} icon={iconGlobe} label="发布中国站" color="text-blue-600 hover:bg-blue-50" />}
              {isOnCN && <Item onClick={() => onOffline('cn')} icon={iconBan} label="下架中国站" color="text-amber-600 hover:bg-amber-50" />}
              {!isOnINTL && <Item onClick={() => onPublish('intl')} icon={iconGlobe} label="发布国际站" color="text-purple-600 hover:bg-purple-50" />}
              {isOnINTL && <Item onClick={() => onOffline('intl')} icon={iconBan} label="下架国际站" color="text-amber-600 hover:bg-amber-50" />}
            </>
          )}

          {status === 'rejected' && (
            <>
              <Divider />
              <Item onClick={onApprove} icon={iconRefresh} label="重新通过" color="text-emerald-600 hover:bg-emerald-50" />
            </>
          )}

          <Divider />
          <Item onClick={onDelete} icon={iconTrash} label="删除" color="text-red-600 hover:bg-red-50" />
        </div>
      )}
    </>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AdminProductsPage() {
  const router = useRouter();
  const { toasts, removeToast, success, error: showError } = useToast();
  const supabase = createClient();

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0, draft: 0, pending_review: 0, approved: 0, published: 0, rejected: 0, offline: 0,
  });
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');

  // Selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Modal state
  const [rejectModal, setRejectModal] = useState<{ product: Product; reason: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [offlineConfirm, setOfflineConfirm] = useState<{ product: Product; siteCode: 'cn' | 'intl' } | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{ action: string; siteCodes?: ('cn' | 'intl')[]; reason?: string } | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // ---- Debounce search ----
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchKeyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Reset page when search changes
  const prevSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch) {
      prevSearchRef.current = debouncedSearch;
      setPage(1);
      setSelectedKeys(new Set());
    }
  }, [debouncedSearch]);

  // ---- Load categories once ----
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from('product_categories')
        .select('id, name, name_en, level, parent_id')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (data) {
        setCategories(data as ProductCategory[]);
      }
    }
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Load products & counts ----
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        // Load status counts in parallel
        const statuses = ['all', 'draft', 'pending_review', 'approved', 'published', 'rejected', 'offline'] as const;
        const countResults = await Promise.all(
          statuses.map(s => {
            let q = supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null);
            if (s !== 'all') q = q.eq('status', s);
            return q;
          })
        );

        if (cancelled) return;

        setStatusCounts({
          all: countResults[0].count || 0,
          draft: countResults[1].count || 0,
          pending_review: countResults[2].count || 0,
          approved: countResults[3].count || 0,
          published: countResults[4].count || 0,
          rejected: countResults[5].count || 0,
          offline: countResults[6].count || 0,
        });

        // Build product query with joins
        let query = supabase
          .from('products')
          .select(`
            id, name, name_en, name_th, name_ja, sku_code, brand, brand_en,
            publish_language, status, image_url, pricing_mode, total_stock,
            created_at, updated_at, published_at, rejection_reason,
            category_id, supplier_id, supplier_uuid,
            supplier:suppliers(company_name),
            site_views:product_site_views(site_code, publish_status, is_enabled),
            product_skus(id, sku_code, price, selling_price, selling_price_usd, stock_quantity, is_active),
            category:product_categories!category_id(id, name, name_en, level)
          `, { count: 'exact' })
          .is('deleted_at', null)
          .range((page - 1) * pageSize, page * pageSize - 1);

        // Status filter
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }
        // Category filter - include all descendant categories
        if (categoryFilter) {
          // Wait for categories to load before filtering
          if (categories.length === 0) {
            if (cancelled) return;
            setLoading(false);
            return; // Will re-run when categories load (due to categories.length in deps)
          }
          // Collect the selected category + all its descendants
          const categoryIds = [categoryFilter];
          const collectDescendants = (parentId: string) => {
            categories.forEach(c => {
              if (c.parent_id === parentId) {
                categoryIds.push(c.id);
                collectDescendants(c.id);
              }
            });
          };
          collectDescendants(categoryFilter);
          query = query.in('category_id', categoryIds);
        }
        // Search
        if (debouncedSearch.trim()) {
          const kw = debouncedSearch.trim();
          query = query.or(`name.ilike.%${kw}%,name_en.ilike.%${kw}%,sku_code.ilike.%${kw}%,brand.ilike.%${kw}%`);
        }
        // Sort
        switch (sortBy) {
          case 'created_asc': query = query.order('created_at', { ascending: true }); break;
          case 'updated_desc': query = query.order('updated_at', { ascending: false }); break;
          case 'name_asc': query = query.order('name', { ascending: true }); break;
          case 'name_desc': query = query.order('name', { ascending: false }); break;
          default: query = query.order('created_at', { ascending: false });
        }

        const { data, error, count } = await query;
        if (error) throw error;
        if (cancelled) return;

        setProducts((data || []) as unknown as Product[]);
        setTotalCount(count || 0);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load products:', err);
        showError('加载失败：' + (err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter, debouncedSearch, page, pageSize, sortBy, refreshCount, categories.length]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // ---- Filter change handlers ----
  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
    setSelectedKeys(new Set());
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // ---- Optimistic update helpers ----
  const refresh = () => { setRefreshCount(c => c + 1); setSelectedKeys(new Set()); };

  const updateProductInList = useCallback((productId: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
  }, []);

  const updateStatusCounts = useCallback((fromStatus: string, toStatus: string) => {
    setStatusCounts(prev => {
      const next = { ...prev };
      if (fromStatus && fromStatus !== 'all' && fromStatus in next) {
        next[fromStatus as keyof StatusCounts] = Math.max(0, (next[fromStatus as keyof StatusCounts] || 0) - 1);
      }
      if (toStatus && toStatus in next) {
        next[toStatus as keyof StatusCounts] = (next[toStatus as keyof StatusCounts] || 0) + 1;
      }
      return next;
    });
  }, []);

  // ---- Action handlers ----

  const handleApprove = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    const oldStatus = product?.status || '';
    updateProductInList(productId, { status: 'approved', rejection_reason: undefined } as any);
    updateStatusCounts(oldStatus, 'approved');
    try {
      const { error } = await supabase.from('products')
        .update({ status: 'approved', rejection_reason: null, updated_at: new Date().toISOString() })
        .eq('id', productId);
      if (error) throw error;
      success('产品已通过审核');
    } catch {
      updateProductInList(productId, { status: oldStatus } as any);
      updateStatusCounts('approved', oldStatus);
      showError('操作失败');
    }
  };

  const handleReject = async () => {
    if (!rejectModal?.reason.trim()) { showError('请输入拒绝原因'); return; }
    const { product, reason } = rejectModal;
    const oldStatus = product.status || '';
    const oldReason = product.rejection_reason;
    updateProductInList(product.id, { status: 'rejected', rejection_reason: reason });
    updateStatusCounts(oldStatus, 'rejected');
    try {
      const { error } = await supabase.from('products')
        .update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', product.id);
      if (error) throw error;
      setRejectModal(null);
      success('产品已拒绝');
    } catch {
      updateProductInList(product.id, { status: oldStatus, rejection_reason: oldReason });
      updateStatusCounts('rejected', oldStatus);
      showError('操作失败');
    }
  };

  const handlePublish = async (productId: string, siteCode: 'cn' | 'intl') => {
    const product = products.find(p => p.id === productId);
    const oldStatus = product?.status || '';
    const oldSiteViews = product?.site_views ? [...product.site_views] : [];
    const newSiteViews = [...(product?.site_views || [])];
    const idx = newSiteViews.findIndex(sv => sv.site_code === siteCode);
    if (idx >= 0) {
      newSiteViews[idx] = { ...newSiteViews[idx], publish_status: 'published', is_enabled: true };
    } else {
      newSiteViews.push({ site_code: siteCode, publish_status: 'published', is_enabled: true });
    }
    updateProductInList(productId, { status: 'published', site_views: newSiteViews });
    if (oldStatus !== 'published') updateStatusCounts(oldStatus, 'published');
    try {
      const { error: svErr } = await supabase.from('product_site_views').upsert({
        product_id: productId, site_code: siteCode,
        publish_status: 'published', is_enabled: true, published_at: new Date().toISOString(),
      }, { onConflict: 'product_id,site_code' });
      if (svErr) throw svErr;
      if (oldStatus !== 'published') {
        const { error: pErr } = await supabase.from('products')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', productId);
        if (pErr) throw pErr;
      }
      success(`已发布到${siteCode === 'cn' ? '中国站' : '国际站'}`);
    } catch {
      updateProductInList(productId, { status: oldStatus, site_views: oldSiteViews });
      if (oldStatus !== 'published') updateStatusCounts('published', oldStatus);
      showError('发布失败');
    }
  };

  const handleOffline = async () => {
    if (!offlineConfirm) return;
    const { product, siteCode } = offlineConfirm;
    const oldSiteViews = product.site_views ? [...product.site_views] : [];
    const newSiteViews = (product.site_views || []).map(sv =>
      sv.site_code === siteCode ? { ...sv, publish_status: 'offline', is_enabled: false } : sv
    );
    updateProductInList(product.id, { site_views: newSiteViews });
    try {
      const { error } = await supabase.from('product_site_views')
        .update({ publish_status: 'offline', is_enabled: false })
        .eq('product_id', product.id).eq('site_code', siteCode);
      if (error) throw error;
      success(`已从${siteCode === 'cn' ? '中国站' : '国际站'}下架`);
    } catch {
      updateProductInList(product.id, { site_views: oldSiteViews });
      showError('下架失败');
    }
    setOfflineConfirm(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const oldStatus = deleteConfirm.status || '';
    const deletedProduct = deleteConfirm;
    setProducts(prev => prev.filter(p => p.id !== deleteConfirm.id));
    setTotalCount(prev => Math.max(0, prev - 1));
    setStatusCounts(prev => ({
      ...prev,
      all: Math.max(0, prev.all - 1),
      ...(oldStatus in prev ? { [oldStatus]: Math.max(0, (prev[oldStatus as keyof StatusCounts] || 0) - 1) } : {}),
    }));
    try {
      const res = await fetch(`/api/v1/admin/products/${deleteConfirm.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteConfirm(null);
      success('产品已删除');
    } catch (err) {
      setProducts(prev => [...prev, deletedProduct].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setTotalCount(prev => prev + 1);
      setStatusCounts(prev => ({
        ...prev,
        all: prev.all + 1,
        ...(oldStatus in prev ? { [oldStatus]: (prev[oldStatus as keyof StatusCounts] || 0) + 1 } : {}),
      }));
      setDeleteConfirm(null);
      showError('删除失败：' + (err as Error).message);
    }
  };

  // ---- Submit for review (supplier products) ----
  const handleSubmitReview = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    const oldStatus = product?.status || '';
    updateProductInList(productId, { status: 'pending_review' } as any);
    updateStatusCounts(oldStatus, 'pending_review');
    try {
      const { error } = await supabase.from('products')
        .update({ status: 'pending_review', updated_at: new Date().toISOString() })
        .eq('id', productId);
      if (error) throw error;
      success('已提交审核');
    } catch {
      updateProductInList(productId, { status: oldStatus } as any);
      updateStatusCounts('pending_review', oldStatus);
      showError('提交审核失败');
    }
  };

  // ---- Bulk actions ----
  const handleBulkAction = async () => {
    if (!bulkConfirm) return;
    const { action, siteCodes, reason } = bulkConfirm;
    if (selectedKeys.size === 0) { showError('请选择产品'); return; }
    if (selectedKeys.size > MAX_BATCH_SIZE) { showError(`最多选择${MAX_BATCH_SIZE}条产品`); return; }
    if (action === 'reject' && !reason?.trim()) { showError('请输入拒绝原因'); return; }
    try {
      const res = await fetch('/api/v1/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, product_ids: Array.from(selectedKeys), site_codes: siteCodes, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBulkConfirm(null);
      setSelectedKeys(new Set());
      refresh();
      const actionLabels: Record<string, string> = {
        approve: '通过',
        reject: '拒绝',
        submit_review: '提交审核',
        delete: '删除',
      };
      // 发布/下架操作带站点信息
      let actionLabel = actionLabels[action] || action;
      if (action === 'publish' && siteCodes?.length === 1) {
        actionLabel = siteCodes[0] === 'cn' ? '上架中国站' : '上架国际站';
      } else if (action === 'offline' && siteCodes?.length === 1) {
        actionLabel = siteCodes[0] === 'cn' ? '下架中国站' : '下架国际站';
      }
      if (data.skipped > 0) {
        success(`成功${actionLabel} ${data.affected} 条，跳过 ${data.skipped} 条（不符合条件）`);
      } else {
        success(`成功${actionLabel} ${data.affected} 条产品`);
      }
    } catch (err) {
      showError('操作失败：' + (err as Error).message);
    }
  };

  // ---- Export ----
  const handleExport = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);
    window.open(`/api/v1/admin/products/export?${params.toString()}`, '_blank');
  };

  // ============================================================================
  // Table Columns
  // ============================================================================

  const columns: Column<Product>[] = useMemo(() => [
    {
      key: 'name',
      header: '产品',
      width: '340px',
      render: (_, product) => {
        const name = getDisplayName(product);
        const brand = getDisplayBrand(product);
        const langs = getLanguages(product);
        return (
          <div className="flex items-center gap-3">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={name}
                className="w-11 h-11 rounded-lg object-cover border border-slate-100 shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-slate-900 text-sm leading-5 line-clamp-1" title={name}>{name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {brand && <span className="text-xs text-slate-500">{brand}</span>}
                {brand && product.sku_code && <span className="text-slate-300">·</span>}
                {product.sku_code && <span className="text-xs text-slate-400 font-mono">{product.sku_code}</span>}
              </div>
              {langs.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {langs.map(l => (
                    <span key={l} className="text-[10px] leading-none px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                      {l}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'category',
      header: '分类',
      hideOnMobile: true,
      render: (_, product) => {
        const cat = product.category;
        if (!cat) return <span className="text-slate-400">-</span>;
        return <span className="text-sm text-slate-700">{cat.name || cat.name_en}</span>;
      },
    },
    {
      key: 'supplier',
      header: '供应商',
      hideOnMobile: true,
      render: (_, product) => {
        const supplierName = (product.supplier as any)?.company_name;
        if (supplierName) {
          return <span className="text-sm text-slate-700">{supplierName}</span>;
        }
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700">
            自营
          </span>
        );
      },
    },
    {
      key: 'price',
      header: '价格',
      render: (_, product) => {
        if (product.pricing_mode === 'inquiry') {
          return <span className="text-sm text-slate-500 italic">询价</span>;
        }
        const { usd, cny, cost } = getPricing(product);
        if (usd === null && cny === null) {
          return <span className="text-slate-400">-</span>;
        }
        return (
          <div className="text-sm">
            {usd !== null && <p className="font-semibold text-slate-900">${usd.toFixed(2)}</p>}
            {cny !== null && <p className="text-xs text-slate-500">¥{cny.toFixed(2)}</p>}
            {cost !== null && <p className="text-xs text-slate-400">成本 ¥{cost.toFixed(2)}</p>}
          </div>
        );
      },
    },
    {
      key: 'stock',
      header: '库存',
      render: (_, product) => {
        const stock = getTotalStock(product);
        const skuCount = product.product_skus?.filter(s => s.is_active)?.length || 0;
        return (
          <div>
            <span className={`text-sm font-medium ${stock <= 0 ? 'text-red-500' : stock < 10 ? 'text-amber-600' : 'text-slate-900'}`}>
              {stock}
            </span>
            {skuCount > 1 && <p className="text-xs text-slate-400">{skuCount} 个 SKU</p>}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: '状态',
      render: (_, product) => {
        const cfg = statusBadgeConfig[product.status];
        return (
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cfg?.className || 'bg-gray-100 text-gray-600'}`}>
              {cfg?.label || product.status}
            </span>
            {product.rejection_reason && (
              <p className="text-xs text-red-500 mt-1 max-w-[140px] truncate" title={product.rejection_reason}>
                {product.rejection_reason}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'site_views',
      header: '站点',
      hideOnMobile: true,
      render: (_, product) => {
        const cn = isPublishedToSite(product, 'cn');
        const intl = isPublishedToSite(product, 'intl');
        return (
          <div className="flex gap-1">
            <span className={`px-1.5 py-0.5 text-[11px] rounded font-medium ${cn ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
              CN
            </span>
            <span className={`px-1.5 py-0.5 text-[11px] rounded font-medium ${intl ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-400'}`}>
              INTL
            </span>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: '创建时间',
      hideOnMobile: true,
      render: (_, product) => (
        <span className="text-sm text-slate-500" title={new Date(product.created_at).toLocaleString('zh-CN')}>
          {formatTime(product.created_at)}
        </span>
      ),
    },
  ], []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="max-w-[1600px] mx-auto p-6">

        {/* ---- Header ---- */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">产品管理</h1>
            <p className="text-slate-500 mt-1 text-sm">
              管理所有产品的审核、发布与下架
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-3.5 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              导出
            </button>
            <button
              onClick={() => router.push('/products/batch-import')}
              className="px-3.5 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              批量导入
            </button>
            <button
              onClick={() => router.push('/products/new')}
              className="px-3.5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              + 添加产品
            </button>
          </div>
        </div>

        {/* ---- Status Tab Bar ---- */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {STATUS_TABS.map(tab => {
            const count = statusCounts[tab.key as keyof StatusCounts] ?? 0;
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleStatusFilterChange(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-white shadow-sm border border-slate-200 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? tab.dotColor : 'bg-slate-300'}`} />
                {tab.label}
                <span className={`text-xs tabular-nums ${active ? 'text-slate-600' : 'text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---- Filter Bar ---- */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索名称、SKU、品牌..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-9 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); setSelectedKeys(new Set()); }}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
          >
            <option value="">全部分类</option>
            {/* Render categories hierarchically: L1 > L2 > L3 */}
            {categories.filter(c => c.level === 1).map(l1 => (
              <React.Fragment key={l1.id}>
                <option value={l1.id}>{l1.name || l1.name_en}</option>
                {categories.filter(c => c.parent_id === l1.id && c.level === 2).map(l2 => (
                  <React.Fragment key={l2.id}>
                    <option value={l2.id}>　　{l2.name || l2.name_en}</option>
                    {categories.filter(c => c.parent_id === l2.id && c.level === 3).map(l3 => (
                      <option key={l3.id} value={l3.id}>　　　　{l3.name || l3.name_en}</option>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[120px]"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* ---- Bulk Action Bar ---- */}
        {selectedKeys.size > 0 && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-blue-800">
              已选择 <strong>{selectedKeys.size}</strong> 条
            </span>
            <div className="flex gap-2 flex-wrap">
              {/* 草稿/已通过/已下架/全部：上架按钮 */}
              {(['draft', 'approved', 'offline', 'all'].includes(statusFilter)) && (
                <>
                  <button onClick={() => setBulkConfirm({ action: 'publish', siteCodes: ['cn'] })} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors">
                    上架中国站
                  </button>
                  <button onClick={() => setBulkConfirm({ action: 'publish', siteCodes: ['intl'] })} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors">
                    上架国际站
                  </button>
                </>
              )}
              {/* 草稿：提交审核（供应商产品） */}
              {statusFilter === 'draft' && (
                <button onClick={() => setBulkConfirm({ action: 'submit_review' })} className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-md hover:bg-amber-600 transition-colors">
                  提交审核
                </button>
              )}
              {/* 待审核：批量通过/拒绝 */}
              {statusFilter === 'pending_review' && (
                <>
                  <button onClick={() => setBulkConfirm({ action: 'approve' })} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors">
                    批量通过
                  </button>
                  <button onClick={() => setBulkConfirm({ action: 'reject' })} className="px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-md hover:bg-orange-600 transition-colors">
                    批量拒绝
                  </button>
                </>
              )}
              {/* 已拒绝：重新通过 */}
              {statusFilter === 'rejected' && (
                <button onClick={() => setBulkConfirm({ action: 'approve' })} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors">
                  重新通过
                </button>
              )}
              {/* 已发布/全部：下架按钮 */}
              {(statusFilter === 'published' || statusFilter === 'all') && (
                <>
                  <button onClick={() => setBulkConfirm({ action: 'offline', siteCodes: ['cn'] })} className="px-3 py-1.5 bg-slate-500 text-white text-xs font-medium rounded-md hover:bg-slate-600 transition-colors">
                    下架中国站
                  </button>
                  <button onClick={() => setBulkConfirm({ action: 'offline', siteCodes: ['intl'] })} className="px-3 py-1.5 bg-slate-500 text-white text-xs font-medium rounded-md hover:bg-slate-600 transition-colors">
                    下架国际站
                  </button>
                </>
              )}
              {/* 所有状态：删除 */}
              <button onClick={() => setBulkConfirm({ action: 'delete' })} className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors">
                批量删除
              </button>
              <button onClick={() => setSelectedKeys(new Set())} className="px-3 py-1.5 text-slate-600 text-xs font-medium rounded-md hover:bg-slate-100 transition-colors">
                取消
              </button>
            </div>
          </div>
        )}

        {/* ---- Data Table ---- */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <DataTable
            columns={columns}
            data={products}
            keyField="id"
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            rowActions={(product) => (
              <ActionDropdown
                product={product}
                onEdit={() => router.push(`/products/${product.id}`)}
                onApprove={() => handleApprove(product.id)}
                onReject={() => setRejectModal({ product, reason: '' })}
                onPublish={(site) => handlePublish(product.id, site)}
                onOffline={(site) => setOfflineConfirm({ product, siteCode: site })}
                onDelete={() => setDeleteConfirm(product)}
                onSubmitReview={() => handleSubmitReview(product.id)}
              />
            )}
            loading={loading}
            emptyMessage="暂无产品数据"
          />

          {/* ---- Pagination ---- */}
          {totalPages > 0 && !loading && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <p className="text-sm text-slate-500">
                  共 <span className="font-medium text-slate-700">{totalCount}</span> 条，
                  显示 {Math.min((page - 1) * pageSize + 1, totalCount)}-{Math.min(page * pageSize, totalCount)}
                </p>
                <select
                  value={pageSize}
                  onChange={e => handlePageSizeChange(Number(e.target.value))}
                  className="px-2 py-1 border border-slate-200 rounded text-xs text-slate-600 bg-white focus:outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n} 条/页</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  上一页
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-600 tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Modals                                                            */}
      {/* ================================================================ */}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">拒绝产品</h3>
            <p className="text-sm text-slate-500 mb-4 truncate">
              {getDisplayName(rejectModal.product)}
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="请输入拒绝原因..."
              className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleReject} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">确认删除</h3>
                <p className="text-sm text-slate-500">此操作不可恢复</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-6 bg-slate-50 px-3 py-2 rounded-lg truncate">
              {getDisplayName(deleteConfirm)}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Confirm */}
      {offlineConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">确认下架</h3>
                <p className="text-sm text-slate-500">
                  从 <strong>{offlineConfirm.siteCode === 'cn' ? '中国站' : '国际站'}</strong> 下架
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-6 bg-slate-50 px-3 py-2 rounded-lg truncate">
              {getDisplayName(offlineConfirm.product)}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOfflineConfirm(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleOffline} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                确认下架
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirm */}
      {bulkConfirm && (() => {
        const actionLabels: Record<string, string> = {
          approve: '批量通过',
          reject: '批量拒绝',
          submit_review: '批量提交审核',
          delete: '批量删除',
        };
        let title = actionLabels[bulkConfirm.action] || '批量操作';
        let desc = `将对 ${selectedKeys.size} 条产品执行此操作，确定继续吗？`;
        const siteCodes = bulkConfirm.siteCodes;
        if (bulkConfirm.action === 'publish' && siteCodes?.length === 1) {
          const siteName = siteCodes[0] === 'cn' ? '中国站' : '国际站';
          title = `批量上架${siteName}`;
          desc = `将把 ${selectedKeys.size} 条产品上架到${siteName}。自营产品直接上架，供应商产品需已通过审核。`;
        } else if (bulkConfirm.action === 'offline' && siteCodes?.length === 1) {
          const siteName = siteCodes[0] === 'cn' ? '中国站' : '国际站';
          title = `批量下架${siteName}`;
          desc = `将从${siteName}下架 ${selectedKeys.size} 条产品。`;
        } else if (bulkConfirm.action === 'submit_review') {
          desc = `将把 ${selectedKeys.size} 条供应商草稿产品提交审核。自营产品将被跳过。`;
        } else if (bulkConfirm.action === 'delete') {
          desc = `将删除 ${selectedKeys.size} 条产品，此操作可通过回收站恢复。`;
        }
        const confirmColor = bulkConfirm.action === 'delete' ? 'bg-red-600 hover:bg-red-700' :
          bulkConfirm.action === 'offline' ? 'bg-slate-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700';
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 mb-4">{desc}</p>
              {bulkConfirm.action === 'reject' && (
                <textarea
                  value={bulkConfirm.reason || ''}
                  onChange={(e) => setBulkConfirm(prev => prev ? { ...prev, reason: e.target.value } : null)}
                  placeholder="请输入拒绝原因..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4 outline-none focus:border-blue-400 resize-none"
                />
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setBulkConfirm(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  取消
                </button>
                <button onClick={handleBulkAction} className={`px-4 py-2 text-sm text-white rounded-lg transition-colors font-medium ${confirmColor}`}>
                  确认
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
