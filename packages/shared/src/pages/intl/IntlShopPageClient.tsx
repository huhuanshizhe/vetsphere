'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import {
  getIntlProducts,
  getIntlProductCategoryTree,
  getIntlProductBrands,
  IntlProduct,
  ProductCategory,
  BrandWithCount,
} from '../../services/intl-api';
import ProductCardMobile, { getPriceRangeForProduct } from '../../components/intl/ProductCardMobile';
import ShopFilterPanel from '../../components/intl/ShopFilterPanel';
import ShopPagination from '../../components/intl/ShopPagination';
import { useShopFilters, PAGE_SIZE } from '../../hooks/useShopFilters';
import {
  Search,
  ChevronRight,
  Package,
  Tag,
  ArrowRight,
  SlidersHorizontal,
  X,
  Loader2,
  ChevronLeft,
} from 'lucide-react';

// ============================================
// Inner component that uses useSearchParams
// ============================================

function ShopPageInner() {
  const { locale, t } = useLanguage();
  const { addToCart } = useCart();
  const s = t.shop;

  const filters = useShopFilters();

  // Data
  const [products, setProducts] = useState<IntlProduct[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<IntlProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<BrandWithCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Mobile filter drawer
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Featured products carousel
  const carouselRef = useRef<HTMLDivElement>(null);

  // Handle add to cart
  const handleAddToCart = useCallback((product: any) => {
    const { minPrice, currency } = getPriceRangeForProduct(product, locale);
    if (minPrice === null || minPrice === undefined || minPrice <= 0) return;

    addToCart({
      id: product.product_id || product.id,
      productId: product.product_id || product.id,
      name: product.display_name,
      price: minPrice,
      quantity: 1,
      type: 'product',
      currency,
      imageUrl: product.cover_image_url,
    });
  }, [locale, addToCart]);

  // Stable key for filter params to prevent infinite re-render loops
  const filterParamsKey = JSON.stringify(filters.filterParams);

  // Load products based on filter params
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getIntlProducts({
        ...filters.filterParams,
        locale,
        featured: false,
      });

      // Client-side price filtering if needed (since SQL price filtering is complex with multi-currency SKU)
      let items = result.items;
      if (filters.priceMin !== null || filters.priceMax !== null) {
        items = items.filter(p => {
          const { minPrice } = getPriceRangeForProduct(p as any, locale);
          if (minPrice === null) return false;
          if (filters.priceMin !== null && minPrice < filters.priceMin) return false;
          if (filters.priceMax !== null && minPrice > filters.priceMax) return false;
          return true;
        });
      }

      setProducts(items);
      setTotal(result.total);
    } catch (error) {
      console.error('[IntlShopPageClient] Failed to load products:', error);
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParamsKey, filters.priceMin, filters.priceMax, locale]);

  // Load featured products (only once)
  const loadFeaturedProducts = useCallback(async () => {
    try {
      const result = await getIntlProducts({ featured: true, limit: 8, locale });
      setFeaturedProducts(result.items);
    } catch {
      setFeaturedProducts([]);
    }
  }, [locale]);

  // Load categories and brands (only once)
  const loadSidebarData = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const [tree, brandList] = await Promise.all([
        getIntlProductCategoryTree(locale),
        getIntlProductBrands(),
      ]);
      setCategories(tree);
      setBrands(brandList);
    } catch (error) {
      console.error('Failed to load sidebar data:', error);
    } finally {
      setCategoriesLoading(false);
    }
  }, [locale]);

  // Effect: load products when filters change
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Effect: load sidebar data and featured products once
  useEffect(() => {
    loadSidebarData();
    loadFeaturedProducts();
  }, [locale]);

  // Carousel scroll helpers
  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const amount = dir === 'left' ? -300 : 300;
    carouselRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  // Active filter tags for display
  const activeFilterTags: Array<{ key: string; label: string; value?: string }> = [];
  if (filters.searchQuery) {
    activeFilterTags.push({ key: 'search', label: `"${filters.searchQuery}"` });
  }
  if (filters.categoryId) {
    const findCat = (cats: ProductCategory[], id: string): string | null => {
      for (const c of cats) {
        if (c.id === id) return c.name_en || c.name;
        if (c.children) {
          const found = findCat(c.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    const catName = findCat(categories, filters.categoryId);
    activeFilterTags.push({ key: 'category', label: catName || 'Category' });
  }
  for (const brand of filters.brands) {
    activeFilterTags.push({ key: 'brand', label: brand, value: brand });
  }
  if (filters.priceMin !== null || filters.priceMax !== null) {
    const parts = [];
    if (filters.priceMin !== null) parts.push(`${filters.priceMin}`);
    parts.push('-');
    if (filters.priceMax !== null) parts.push(`${filters.priceMax}`);
    activeFilterTags.push({ key: 'price', label: parts.join(' ') });
  }
  if (filters.purchaseType) {
    activeFilterTags.push({
      key: 'purchaseType',
      label: filters.purchaseType === 'direct' ? (s.directPurchase || 'Direct Buy') : (s.quoteRequest || 'Quote'),
    });
  }

  // Sort options
  const SORT_OPTIONS = [
    { value: 'featured', label: s.sortFeatured },
    { value: 'newest', label: s.sortNewest },
    { value: 'price-low', label: s.sortPriceLow },
    { value: 'price-high', label: s.sortPriceHigh },
    { value: 'name-asc', label: s.sortNameAsc },
  ] as const;

  // Show featured only when no active filters
  const showFeatured = !filters.hasActiveFilters && featuredProducts.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* ========== 1. Slim Hero Banner ========== */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 pt-24 pb-6">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-4">
            <Link href={`/${locale}`} className="hover:text-blue-600 transition">{t.productDetail?.home || 'Home'}</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 font-medium">{s.heroTitleHighlight || 'Equipment Shop'}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {s.heroTitle} <span className="text-blue-600">{s.heroTitleHighlight}</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1 hidden md:block">
                {total}+ {s.productsCount} &middot; {categories.length} {s.categoriesCount}
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full md:max-w-md lg:max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={s.searchPlaceholder}
                value={filters.searchInput}
                onChange={(e) => filters.setSearchInput(e.target.value)}
                className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-sm
                  focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm transition-all"
              />
              {filters.searchInput && (
                <button
                  onClick={() => filters.setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========== 2. Active Filter Tags ========== */}
      {activeFilterTags.length > 0 && (
        <div className="border-b border-slate-100 bg-slate-50/50">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                {s.activeFilters || 'Filters'}:
              </span>
              {activeFilterTags.map((tag, i) => (
                <button
                  key={`${tag.key}-${tag.value || i}`}
                  onClick={() => filters.removeFilter(tag.key, tag.value)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200
                    rounded-full text-xs font-medium text-slate-700 hover:bg-red-50 hover:border-red-200
                    hover:text-red-700 transition-colors group"
                >
                  {tag.label}
                  <X className="w-3 h-3 text-slate-400 group-hover:text-red-500" />
                </button>
              ))}
              <button
                onClick={filters.clearAllFilters}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 ml-1"
              >
                {s.clearAll || 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 3. Featured Products Carousel ========== */}
      {showFeatured && (
        <section className="border-b border-slate-100">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{s.featuredProducts}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollCarousel('left')}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hidden md:flex"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollCarousel('right')}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hidden md:flex"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none' }}
            >
              {featuredProducts.map(product => (
                <div key={product.id} className="w-[260px] shrink-0 snap-start">
                  <ProductCardMobile
                    product={{
                      id: product.id,
                      product_id: product.product_id,
                      display_name: product.display_name,
                      slug: product.slug,
                      summary: product.summary,
                      pricing_mode: product.pricing_mode,
                      display_price: product.display_price,
                      currency_code: product.currency_code,
                      purchase_type: product.purchase_type,
                      is_featured: product.is_featured,
                      display_tags: product.display_tags,
                      recommendation_reason: product.recommendation_reason,
                      cover_image_url: product.cover_image_url,
                      brand: product.brand,
                      has_variants: product.has_variants,
                      price_min: product.price_min,
                      price_max: product.price_max,
                      sku_price_usd_min: product.sku_price_usd_min,
                      sku_price_usd_max: product.sku_price_usd_max,
                      sku_price_jpy_min: product.sku_price_jpy_min,
                      sku_price_jpy_max: product.sku_price_jpy_max,
                      sku_price_thb_min: product.sku_price_thb_min,
                      sku_price_thb_max: product.sku_price_thb_max,
                      sku_price_cny_min: product.sku_price_cny_min,
                      sku_price_cny_max: product.sku_price_cny_max,
                    }}
                    locale={locale}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== 4. Main Content: Sidebar + Product Grid ========== */}
      <section className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="flex gap-8">

          {/* Left: Filter Panel (Desktop) */}
          <ShopFilterPanel
            categories={categories}
            brands={brands}
            selectedCategoryId={filters.categoryId}
            selectedBrands={filters.brands}
            priceMin={filters.priceMin}
            priceMax={filters.priceMax}
            purchaseType={filters.purchaseType}
            onCategoryChange={filters.setCategoryId}
            onBrandsChange={filters.setBrands}
            onToggleBrand={filters.toggleBrand}
            onPriceRangeChange={filters.setPriceRange}
            onPurchaseTypeChange={filters.setPurchaseType}
            onClearAll={filters.clearAllFilters}
            activeFilterCount={filters.activeFilterCount}
          />

          {/* Right: Products */}
          <div className="flex-1 min-w-0" id="product-grid">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5 gap-3">
              {/* Mobile filter button */}
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl
                  text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {s.filters || 'Filters'}
                {filters.activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                    {filters.activeFilterCount}
                  </span>
                )}
              </button>

              {/* Result count */}
              <p className="text-sm text-slate-500 hidden sm:block">
                {s.showingCount
                  ?.replace('{count}', String(products.length))
                  .replace('{total}', String(total))}
              </p>

              {/* Sort */}
              <div className="flex items-center gap-2 ml-auto">
                <SlidersHorizontal className="w-4 h-4 text-slate-400 hidden sm:block" />
                <select
                  value={filters.sortBy}
                  onChange={(e) => filters.setSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[...Array(PAGE_SIZE > 12 ? 12 : PAGE_SIZE)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden bg-white animate-pulse">
                    <div className="aspect-square bg-slate-100" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="pt-3 border-t border-slate-100 flex justify-between">
                        <div className="h-5 bg-slate-100 rounded w-20" />
                        <div className="h-8 bg-slate-100 rounded w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">{s.noProductsFound}</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                  {filters.hasActiveFilters
                    ? (s.noResultsWithFilters || 'No products match your current filters. Try adjusting or clearing your filters.')
                    : (s.noProductsAvailable || 'No products available at the moment.')
                  }
                </p>
                {filters.hasActiveFilters && (
                  <button
                    onClick={filters.clearAllFilters}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                  >
                    {s.clearAll || 'Clear All Filters'}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {products.map(product => (
                    <ProductCardMobile
                      key={product.id}
                      product={{
                        id: product.id,
                        product_id: product.product_id,
                        display_name: product.display_name,
                        slug: product.slug,
                        summary: product.summary,
                        pricing_mode: product.pricing_mode,
                        display_price: product.display_price,
                        currency_code: product.currency_code,
                        purchase_type: product.purchase_type,
                        is_featured: product.is_featured,
                        display_tags: product.display_tags,
                        recommendation_reason: product.recommendation_reason,
                        cover_image_url: product.cover_image_url,
                        brand: product.brand,
                        has_variants: product.has_variants,
                        price_min: product.price_min,
                        price_max: product.price_max,
                        sku_price_usd_min: product.sku_price_usd_min,
                        sku_price_usd_max: product.sku_price_usd_max,
                        sku_price_jpy_min: product.sku_price_jpy_min,
                        sku_price_jpy_max: product.sku_price_jpy_max,
                        sku_price_thb_min: product.sku_price_thb_min,
                        sku_price_thb_max: product.sku_price_thb_max,
                        sku_price_cny_min: product.sku_price_cny_min,
                        sku_price_cny_max: product.sku_price_cny_max,
                      }}
                      locale={locale}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <ShopPagination
                  currentPage={filters.page}
                  totalItems={total}
                  pageSize={PAGE_SIZE}
                  onPageChange={filters.setPage}
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* ========== 5. Mobile Filter Drawer ========== */}
      <ShopFilterPanel
        categories={categories}
        brands={brands}
        selectedCategoryId={filters.categoryId}
        selectedBrands={filters.brands}
        priceMin={filters.priceMin}
        priceMax={filters.priceMax}
        purchaseType={filters.purchaseType}
        onCategoryChange={filters.setCategoryId}
        onBrandsChange={filters.setBrands}
        onToggleBrand={filters.toggleBrand}
        onPriceRangeChange={filters.setPriceRange}
        onPurchaseTypeChange={filters.setPurchaseType}
        onClearAll={filters.clearAllFilters}
        activeFilterCount={filters.activeFilterCount}
        isMobile={true}
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        totalResults={total}
      />

      {/* ========== 6. Slim CTA Banner ========== */}
      <section className="border-t border-slate-100">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-10">
          <div className="bg-blue-50 rounded-2xl px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">{s.needCustomSolutions}</h3>
              <p className="text-sm text-slate-600">{s.customSolutionsDesc}</p>
            </div>
            <Link
              href={`/${locale}/for-clinics#consultation`}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700
                transition-colors flex items-center gap-2 shrink-0 shadow-sm"
            >
              {s.requestQuote}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================
// Exported component with Suspense boundary
// ============================================

export default function IntlShopPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <ShopPageInner />
    </Suspense>
  );
}
