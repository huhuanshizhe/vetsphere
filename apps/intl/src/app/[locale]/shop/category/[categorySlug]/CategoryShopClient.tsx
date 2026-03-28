'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@vetsphere/shared/services/api';
import { useCart } from '@vetsphere/shared/context/CartContext';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { useSiteConfig } from '@vetsphere/shared/context/SiteConfigContext';
import type { Product } from '@vetsphere/shared/types';
import CategoryTabs, { CategoryTabItem } from '@vetsphere/shared/components/intl/CategoryTabs';
import ProductCardMobile, { ProductCardMobileSkeleton } from '@vetsphere/shared/components/intl/ProductCardMobile';
import ShippingEstimator from '@vetsphere/shared/components/intl/ShippingEstimator';
import { Search, X, SlidersHorizontal, ChevronDown, Package } from 'lucide-react';

interface CategoryShopClientProps {
  categorySlug: string;
  categoryName: string;
  locale: string;
}

export default function CategoryShopClient({ categorySlug, categoryName, locale }: CategoryShopClientProps) {
  const router = useRouter();
  const { cart, addToCart } = useCart();
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { siteConfig } = useSiteConfig();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name'>('default');
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Get specialty dimension from config
  const specialtyDimension = useMemo(() =>
    siteConfig.shopCategories?.dimensions.find(d => d.key === 'specialty'),
    [siteConfig.shopCategories]
  );

  const specialties = useMemo(() =>
    specialtyDimension?.categories ?? [],
    [specialtyDimension]
  );

  // Get category tabs with product counts
  const categoryTabs = useMemo((): CategoryTabItem[] => {
    const tabDimension = siteConfig.shopCategories?.dimensions.find(d => d.displayAs === 'tabs');

    if (!tabDimension?.categories) return [];

    // Calculate product counts per category
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.status?.toLowerCase() === 'published' && p.clinicalCategory) {
        counts[p.clinicalCategory] = (counts[p.clinicalCategory] || 0) + 1;
      }
    });

    return tabDimension.categories.map(cat => ({
      slug: cat.slug || cat.key,
      name: cat.labels,
      productCount: counts[cat.slug || cat.key] || 0,
      icon: cat.icon,
    }));
  }, [products, siteConfig.shopCategories]);

  const getLabel = (cat: { key: string; labels: Record<string, string> }) =>
    cat.labels[language] || cat.labels['en'] || Object.values(cat.labels)[0] || cat.key;

  useEffect(() => {
    api.getProducts().then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  // Filter products by category and other criteria
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.status && p.status.toLowerCase() !== 'published') return false;

      // Filter by clinical category
      if (p.clinicalCategory !== categorySlug) return false;

      // Filter by specialty if selected
      if (selectedSpecialty !== 'All' && p.specialty !== selectedSpecialty) return false;

      // Search filter
      const matchSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchSearch;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  }, [products, categorySlug, selectedSpecialty, searchQuery, sortBy]);

  const handleAddToCart = (product: Product) => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth`);
      return;
    }

    if (product.purchaseMode === 'inquiry') {
      router.push(`/${locale}/shop/${product.id}`);
      return;
    }

    // Use cart context to add item
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      type: 'product',
      currency: 'USD',
      imageUrl: product.imageUrl,
    });

    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 2000);
  };

  // Translations
  const labels = {
    en: {
      home: 'Home', shop: 'Equipment Shop', products: 'products', search: 'Search',
      searchPlaceholder: 'Search products...', filters: 'Filters', clearFilters: 'Clear All',
      sortDefault: 'Default', sortPriceAsc: 'Price: Low to High', sortPriceDesc: 'Price: High to Low',
      sortName: 'Name A-Z', noProducts: 'No products found', browseAll: 'Browse all products',
      specialty: 'Specialty', allSpecialties: 'All Specialties', backToShop: '← Back to Shop',
    },
    th: {
      home: 'หน้าแรก', shop: 'ร้านค้าอุปกรณ์', products: 'สินค้า', search: 'ค้นหา',
      searchPlaceholder: 'ค้นหาสินค้า...', filters: 'ตัวกรอง', clearFilters: 'ล้างทั้งหมด',
      sortDefault: 'ค่าเริ่มต้น', sortPriceAsc: 'ราคา: ต่ำ-สูง', sortPriceDesc: 'ราคา: สูง-ต่ำ',
      sortName: 'ชื่อ A-Z', noProducts: 'ไม่พบสินค้า', browseAll: 'ดูสินค้าทั้งหมด',
      specialty: 'ความเชี่ยวชาญ', allSpecialties: 'ทั้งหมด', backToShop: '← กลับไปร้านค้า',
    },
    ja: {
      home: 'ホーム', shop: '機器ショップ', products: '商品', search: '検索',
      searchPlaceholder: '商品を検索...', filters: 'フィルター', clearFilters: 'すべてクリア',
      sortDefault: 'デフォルト', sortPriceAsc: '価格: 低→高', sortPriceDesc: '価格: 高→低',
      sortName: '名前 A-Z', noProducts: '商品が見つかりません', browseAll: 'すべての商品を見る',
      specialty: '専門分野', allSpecialties: 'すべて', backToShop: '← ショップに戻る',
    },
  };
  const l = labels[language as keyof typeof labels] || labels.en;

  return (
    <div className="bg-[#FBFCFB] min-h-screen pt-20 md:pt-28 lg:pt-32 relative">
      <div className="vs-container pb-20">

        {/* Header */}
        <div className="mb-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs md:text-sm text-slate-400 mb-4">
            <button onClick={() => router.push(`/${locale}`)} className="hover:text-[#00A884]">{l.home}</button>
            <span>/</span>
            <button onClick={() => router.push(`/${locale}/shop`)} className="hover:text-[#00A884]">{l.shop}</button>
            <span>/</span>
            <span className="text-slate-900 font-bold">{categoryName}</span>
          </nav>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {categoryName}
            </h1>

            {/* Desktop Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="hidden md:block px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-[#00A884] transition-colors cursor-pointer"
            >
              <option value="default">{l.sortDefault}</option>
              <option value="price-asc">{l.sortPriceAsc}</option>
              <option value="price-desc">{l.sortPriceDesc}</option>
              <option value="name">{l.sortName}</option>
            </select>
          </div>
        </div>

        {/* Dynamic Category Tabs */}
        <CategoryTabs
          categories={categoryTabs}
          activeSlug={categorySlug}
          baseUrl={`/${locale}/shop`}
        />

        {/* Mobile Filter Bar */}
        <div className="flex md:hidden items-center justify-between mb-4 gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={l.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-medium outline-none focus:border-[#00A884] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {l.filters}
          </button>
        </div>

        {/* Mobile Sort (below search) */}
        <div className="flex md:hidden items-center justify-between mb-4">
          <p className="text-xs text-slate-500">
            {filteredProducts.length} {l.products}
          </p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 outline-none cursor-pointer"
          >
            <option value="default">{l.sortDefault}</option>
            <option value="price-asc">{l.sortPriceAsc}</option>
            <option value="price-desc">{l.sortPriceDesc}</option>
            <option value="name">{l.sortName}</option>
          </select>
        </div>

        {/* Mobile Filter Drawer */}
        {showMobileFilters && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileFilters(false)}>
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">{l.filters}</h3>
                <button onClick={() => setShowMobileFilters(false)} className="text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-6">
                {/* Specialty Filter */}
                {specialties.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                      {specialtyDimension?.displayName[language] || specialtyDimension?.displayName.en || l.specialty}
                    </h4>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => { setSelectedSpecialty('All'); setShowMobileFilters(false); }}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                          selectedSpecialty === 'All' ? 'bg-[#00A884] text-white' : 'text-slate-600 bg-slate-50'
                        }`}
                      >
                        {l.allSpecialties}
                        {selectedSpecialty === 'All' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </button>
                      {specialties.map(spec => (
                        <button
                          key={spec.key}
                          onClick={() => { setSelectedSpecialty(spec.key); setShowMobileFilters(false); }}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                            selectedSpecialty === spec.key ? 'bg-[#00A884] text-white' : 'text-slate-600 bg-slate-50'
                          }`}
                        >
                          {getLabel(spec)}
                          {selectedSpecialty === spec.key && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear Filters */}
                {(selectedSpecialty !== 'All' || searchQuery) && (
                  <button
                    onClick={() => { setSelectedSpecialty('All'); setSearchQuery(''); setShowMobileFilters(false); }}
                    className="w-full py-3 text-sm font-bold text-red-500 bg-red-50 rounded-xl"
                  >
                    {l.clearFilters}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-64 space-y-8 shrink-0">
            {/* Search */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                {l.search}
              </h4>
              <div className="relative">
                <input
                  type="text"
                  placeholder={l.searchPlaceholder}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm font-medium outline-none focus:border-[#00A884] transition-colors pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Specialty Filter */}
            {specialties.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                  {specialtyDimension?.displayName[language] || specialtyDimension?.displayName.en || l.specialty}
                </h4>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setSelectedSpecialty('All')}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      selectedSpecialty === 'All' ? 'bg-[#00A884]/5 text-[#00A884]' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {l.allSpecialties}
                    {selectedSpecialty === 'All' && <span className="w-1.5 h-1.5 bg-[#00A884] rounded-full" />}
                  </button>
                  {specialties.map(spec => (
                    <button
                      key={spec.key}
                      onClick={() => setSelectedSpecialty(spec.key)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        selectedSpecialty === spec.key ? 'bg-[#00A884]/5 text-[#00A884]' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {getLabel(spec)}
                      {selectedSpecialty === spec.key && <span className="w-1.5 h-1.5 bg-[#00A884] rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Back to Shop */}
            <button
              onClick={() => router.push(`/${locale}/shop`)}
              className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors"
            >
              {l.backToShop}
            </button>
          </aside>

          {/* Product Grid - Mobile Optimized */}
          <div className="flex-1">
            {/* Loading State */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardMobileSkeleton key={i} />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              /* Product Grid - 2 columns on mobile, 3-4 on larger screens */
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                {filteredProducts.map(product => (
                  <ProductCardMobile
                    key={product.id}
                    product={{
                      id: product.id,
                      product_id: product.id,
                      display_name: product.name,
                      slug: product.id,
                      summary: product.description,
                      pricing_mode: product.purchaseMode === 'inquiry' ? 'inquiry' : 'fixed',
                      display_price: product.price,
                      currency_code: 'USD',
                      purchase_type: product.purchaseMode === 'inquiry' ? 'quote' : 'direct',
                      is_featured: false,
                      display_tags: [],
                      recommendation_reason: null,
                      cover_image_url: product.imageUrl,
                      brand: product.brand,
                      price_min: product.priceRangeMin,
                      price_max: product.priceRangeMax,
                    }}
                    locale={locale}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="py-16 md:py-24 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-600 mb-2">{l.noProducts}</h3>
                <button
                  onClick={() => router.push(`/${locale}/shop`)}
                  className="mt-4 px-6 py-3 bg-[#00A884] text-white rounded-xl font-bold text-sm hover:bg-[#008F70] transition-colors"
                >
                  {l.browseAll}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Shipping Estimator */}
        {cart.filter(i => i.type === 'product').length > 0 && (
          <div className="mt-12">
            <ShippingEstimator locale={locale} language={language} />
          </div>
        )}
      </div>
    </div>
  );
}
