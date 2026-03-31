'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import {
  getIntlProducts,
  getIntlProductCategoryTree,
  IntlProduct,
  ProductCategory,
} from '../../services/intl-api';
import ProductCardMobile, { getPriceRangeForProduct } from '../../components/intl/ProductCardMobile';
import {
  Search,
  ChevronRight,
  Package,
  Building2,
  ArrowRight,
  Tag,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';

// ============================================
// Constants
// ============================================

const PAGE_SIZE = 12;

// ============================================
// Component
// ============================================

export default function IntlShopPageClient() {
  const { locale, t } = useLanguage();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const s = t.shop;

  // Data
  const [products, setProducts] = useState<IntlProduct[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<IntlProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price-low' | 'price-high' | 'name-asc'>('featured');

  // Sort options with translations
  const SORT_OPTIONS = [
    { value: 'featured', label: s.sortFeatured },
    { value: 'newest', label: s.sortNewest },
    { value: 'price-low', label: s.sortPriceLow },
    { value: 'price-high', label: s.sortPriceHigh },
    { value: 'name-asc', label: s.sortNameAsc },
  ] as const;

  // Handle add to cart - allow guest users to add items, require login at checkout
  const handleAddToCart = useCallback((product: any) => {
    // Get proper price based on locale using SKU prices
    const { minPrice, currency } = getPriceRangeForProduct(product, locale);

    // If product is inquiry/quote type, don't add to cart
    if (minPrice === null || minPrice === undefined || minPrice <= 0) {
      return;
    }

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

  // Load products with filters
  const loadProducts = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await getIntlProducts({
        featured: false,
        limit: PAGE_SIZE,
        offset: pageNum * PAGE_SIZE,
        locale,
        sortBy,
        categoryId: selectedCategory || undefined,
      });

      if (append) {
        setProducts(prev => [...prev, ...result.items]);
      } else {
        setProducts(result.items);
      }
      setTotal(result.total);
    } catch (error) {
      console.error('[IntlShopPageClient] Failed to load products:', error);
      if (!append) {
        setProducts([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [locale, sortBy, selectedCategory]);

  // Load featured products
  const loadFeaturedProducts = useCallback(async () => {
    try {
      const result = await getIntlProducts({
        featured: true,
        limit: 8,
        locale,
      });
      setFeaturedProducts(result.items);
    } catch (error) {
      console.error('Failed to load featured products:', error);
      setFeaturedProducts([]);
    }
  }, [locale]);

  // Load categories
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const tree = await getIntlProductCategoryTree(locale);
      setCategories(tree);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  }, [locale]);

  // Initial load
  useEffect(() => {
    loadProducts(0);
    loadFeaturedProducts();
  }, [sortBy, selectedCategory]); // Re-fetch when filters change

  // Load categories once
  useEffect(() => {
    loadCategories();
  }, [locale]);

  // Filter products by search query (client-side)
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p =>
      p.display_name.toLowerCase().includes(query) ||
      p.brand?.toLowerCase().includes(query) ||
      p.specialty?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Handlers
  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setPage(0);
    setProducts([]);
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy);
    setPage(0);
    setProducts([]);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadProducts(nextPage, true);
  };

  const hasMore = products.length < total;

  // ============================================
  // Render
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-32 pb-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-[128px] opacity-20" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-500 rounded-full blur-[128px] opacity-20" />
        </div>

        <div className="relative max-w-[1600px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm mb-6">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-blue-300 uppercase tracking-widest">{s.b2bBadge}</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                {s.heroTitle} <br />
                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  {s.heroTitleHighlight}
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-300 mb-8 leading-relaxed">
                {s.heroSubtitle}
              </p>

              {/* Search Bar */}
              <div className="relative max-w-lg">
                <input
                  type="text"
                  placeholder={s.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 md:py-5 rounded-2xl border border-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-lg bg-white/95 backdrop-blur-sm shadow-2xl"
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 md:gap-8 mt-8 pt-6 border-t border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Package className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{total}+</p>
                    <p className="text-sm text-slate-400">{s.productsCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Tag className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{categories.length}+</p>
                    <p className="text-sm text-slate-400">{s.categoriesCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="hidden lg:block relative">
              <div className="relative">
                {/* Main Image Container */}
                <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20 border border-white/10">
                  <img
                    src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=400&fit=crop&q=80"
                    alt="Veterinary Orthopedic Surgery Equipment"
                    className="w-full h-auto object-cover"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                </div>

                {/* Floating Badge */}
                <div className="absolute -bottom-4 -left-4 z-20 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Premium Quality</p>
                    <p className="text-xs text-slate-500">Veterinary Equipment</p>
                  </div>
                </div>

                {/* Secondary Floating Card */}
                <div className="absolute -top-4 -right-4 z-20 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700">Global Shipping</span>
                  </div>
                  <p className="text-xs text-slate-500">50+ Countries</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="px-4 md:px-8 lg:px-16 py-12 bg-gradient-to-b from-blue-50/50 to-white">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-slate-900">{s.featuredProducts}</h2>
              <Link
                href={`/${locale}/shop`}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
              >
                {s.viewAll} <ChevronRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map(product => (
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
          </div>
        </section>
      )}

      {/* Main Products Section */}
      <section className="px-4 md:px-8 lg:px-16 py-12">
        <div className="max-w-[1600px] mx-auto">

          {/* Filters Bar */}
          <div className="mb-8 space-y-4">
            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryChange(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === null
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {s.allCategories}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name_en || cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Sort Options */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <SlidersHorizontal className="w-4 h-4" />
                <span>{s.sortBy}</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-sm text-slate-500">
              {s.showingCount.replace('{count}', String(filteredProducts.length)).replace('{total}', String(total))}
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden bg-white animate-pulse">
                  <div className="aspect-square bg-slate-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-slate-100 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">{s.noProductsFound}</h3>
              <p className="text-slate-600 mb-6">
                {searchQuery
                  ? s.noProductsMatch.replace('{query}', searchQuery)
                  : s.noProductsAvailable
                }
              </p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
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

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{s.loadMore}...</span>
                      </>
                    ) : (
                      s.loadMore
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 md:px-8 lg:px-16 py-20">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-10 w-64 h-64 border border-white rounded-full" />
              <div className="absolute bottom-10 left-10 w-96 h-96 border border-white rounded-full" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                {s.needCustomSolutions}
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                {s.customSolutionsDesc}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href={`/${locale}/for-clinics#consultation`}
                  className="px-10 py-4 bg-white text-blue-700 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all shadow-xl flex items-center justify-center gap-3"
                >
                  {s.requestQuote}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href={`/${locale}/courses`}
                  className="px-10 py-4 bg-blue-800/50 text-white border-2 border-white/30 rounded-2xl font-bold text-lg hover:bg-blue-800/70 transition-all flex items-center justify-center"
                >
                  {s.exploreTraining}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
