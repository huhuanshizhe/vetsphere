'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// ============================================
// Types
// ============================================

export type SortOption = 'featured' | 'newest' | 'price-low' | 'price-high' | 'name-asc';

export interface ShopFilterState {
  searchQuery: string;
  categoryId: string | null;
  brands: string[];
  priceMin: number | null;
  priceMax: number | null;
  purchaseType: 'direct' | 'quote' | null;
  sortBy: SortOption;
  page: number;
}

export interface ShopFilterActions {
  setSearchQuery: (q: string) => void;
  setCategoryId: (id: string | null) => void;
  setBrands: (brands: string[]) => void;
  toggleBrand: (brand: string) => void;
  setPriceRange: (min: number | null, max: number | null) => void;
  setPurchaseType: (type: 'direct' | 'quote' | null) => void;
  setSortBy: (sort: SortOption) => void;
  setPage: (page: number) => void;
  clearAllFilters: () => void;
  removeFilter: (key: string, value?: string) => void;
}

export interface ShopFilterMeta {
  hasActiveFilters: boolean;
  activeFilterCount: number;
  /** Immediate search input value (not debounced) */
  searchInput: string;
  setSearchInput: (v: string) => void;
  /** Params ready to pass to getIntlProducts */
  filterParams: {
    search?: string;
    categoryId?: string;
    brands?: string[];
    priceMin?: number;
    priceMax?: number;
    purchaseType?: 'direct' | 'quote';
    sortBy: SortOption;
    limit: number;
    offset: number;
  };
}

export type UseShopFiltersReturn = ShopFilterState & ShopFilterActions & ShopFilterMeta;

// ============================================
// Constants
// ============================================

export const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 400;

// ============================================
// Hook
// ============================================

export function useShopFilters(): UseShopFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- Read from URL ---
  const readState = useCallback((): ShopFilterState => {
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || null;
    const brandsStr = searchParams.get('brands') || '';
    const brands = brandsStr ? brandsStr.split(',').filter(Boolean) : [];
    const priceMinStr = searchParams.get('priceMin');
    const priceMaxStr = searchParams.get('priceMax');
    const priceMin = priceMinStr ? Number(priceMinStr) : null;
    const priceMax = priceMaxStr ? Number(priceMaxStr) : null;
    const pt = searchParams.get('purchaseType') as 'direct' | 'quote' | null;
    const purchaseType = pt === 'direct' || pt === 'quote' ? pt : null;
    const sort = (searchParams.get('sort') || 'featured') as SortOption;
    const pageStr = searchParams.get('page');
    const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

    return { searchQuery: q, categoryId: category, brands, priceMin, priceMax, purchaseType, sortBy: sort, page };
  }, [searchParams]);

  const state = readState();

  // --- Immediate search input (not debounced) ---
  const [searchInput, setSearchInput] = useState(state.searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync searchInput when URL changes externally
  useEffect(() => {
    setSearchInput(state.searchQuery);
  }, [state.searchQuery]);

  // --- URL updater ---
  const updateURL = useCallback((updates: Partial<ShopFilterState>, resetPage = true) => {
    const current = readState();
    const merged = { ...current, ...updates };
    if (resetPage && !('page' in updates)) {
      merged.page = 1;
    }

    const params = new URLSearchParams();
    if (merged.searchQuery) params.set('q', merged.searchQuery);
    if (merged.categoryId) params.set('category', merged.categoryId);
    if (merged.brands.length > 0) params.set('brands', merged.brands.join(','));
    if (merged.priceMin !== null) params.set('priceMin', String(merged.priceMin));
    if (merged.priceMax !== null) params.set('priceMax', String(merged.priceMax));
    if (merged.purchaseType) params.set('purchaseType', merged.purchaseType);
    if (merged.sortBy !== 'featured') params.set('sort', merged.sortBy);
    if (merged.page > 1) params.set('page', String(merged.page));

    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    router.replace(url, { scroll: false });
  }, [pathname, router, readState]);

  // --- Actions ---
  const setSearchQuery = useCallback((q: string) => {
    setSearchInput(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateURL({ searchQuery: q });
    }, SEARCH_DEBOUNCE_MS);
  }, [updateURL]);

  const setCategoryId = useCallback((id: string | null) => {
    updateURL({ categoryId: id });
  }, [updateURL]);

  const setBrands = useCallback((brands: string[]) => {
    updateURL({ brands });
  }, [updateURL]);

  const toggleBrand = useCallback((brand: string) => {
    const current = readState().brands;
    const next = current.includes(brand)
      ? current.filter(b => b !== brand)
      : [...current, brand];
    updateURL({ brands: next });
  }, [readState, updateURL]);

  const setPriceRange = useCallback((min: number | null, max: number | null) => {
    updateURL({ priceMin: min, priceMax: max });
  }, [updateURL]);

  const setPurchaseType = useCallback((type: 'direct' | 'quote' | null) => {
    updateURL({ purchaseType: type });
  }, [updateURL]);

  const setSortBy = useCallback((sort: SortOption) => {
    updateURL({ sortBy: sort });
  }, [updateURL]);

  const setPage = useCallback((page: number) => {
    updateURL({ page }, false);
  }, [updateURL]);

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const removeFilter = useCallback((key: string, value?: string) => {
    switch (key) {
      case 'search':
        setSearchInput('');
        updateURL({ searchQuery: '' });
        break;
      case 'category':
        updateURL({ categoryId: null });
        break;
      case 'brand':
        if (value) {
          const current = readState().brands;
          updateURL({ brands: current.filter(b => b !== value) });
        }
        break;
      case 'price':
        updateURL({ priceMin: null, priceMax: null });
        break;
      case 'purchaseType':
        updateURL({ purchaseType: null });
        break;
      default:
        break;
    }
  }, [readState, updateURL]);

  // --- Meta ---
  // Use primitive dependencies to avoid infinite re-render loops
  // (state is a new object every render, so [state] would never memoize)
  const brandsKey = state.brands.join(',');

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (state.searchQuery) count++;
    if (state.categoryId) count++;
    if (state.brands.length > 0) count += state.brands.length;
    if (state.priceMin !== null || state.priceMax !== null) count++;
    if (state.purchaseType) count++;
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.searchQuery, state.categoryId, brandsKey, state.priceMin, state.priceMax, state.purchaseType]);

  const filterParams = useMemo(() => {
    const params: ShopFilterMeta['filterParams'] = {
      sortBy: state.sortBy,
      limit: PAGE_SIZE,
      offset: (state.page - 1) * PAGE_SIZE,
    };
    if (state.searchQuery) params.search = state.searchQuery;
    if (state.categoryId) params.categoryId = state.categoryId;
    if (state.brands.length > 0) params.brands = state.brands;
    if (state.priceMin !== null) params.priceMin = state.priceMin;
    if (state.priceMax !== null) params.priceMax = state.priceMax;
    if (state.purchaseType) params.purchaseType = state.purchaseType;
    return params;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sortBy, state.page, state.searchQuery, state.categoryId, brandsKey, state.priceMin, state.priceMax, state.purchaseType]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    ...state,
    // Actions
    setSearchQuery,
    setCategoryId,
    setBrands,
    toggleBrand,
    setPriceRange,
    setPurchaseType,
    setSortBy,
    setPage,
    clearAllFilters,
    removeFilter,
    // Meta
    hasActiveFilters: activeFilterCount > 0,
    activeFilterCount,
    searchInput,
    setSearchInput: setSearchQuery,
    filterParams,
  };
}
