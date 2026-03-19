'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import {
  getIntlProducts,
  IntlProduct,
} from '../../services/intl-api';
import {
  Search,
  SlidersHorizontal,
  Package,
  Wrench,
  ArrowRight,
  X,
  Star,
  MessageSquareQuote,
  ShoppingCart,
} from 'lucide-react';

// ============================================
// Constants
// ============================================

const SPECIALTIES = [
  'All',
  'Orthopedics',
  'Neurosurgery',
  'Soft Tissue',
  'Eye Surgery',
  'Ultrasound',
  'Exotics',
];

const CATEGORIES = [
  'All',
  'Power Tools',
  'Implants',
  'Hand Instruments',
  'Consumables',
  'Equipment',
  'Monitoring',
];

const PURCHASE_TYPES = [
  { value: 'All', label: 'All Types' },
  { value: 'direct', label: 'Direct Purchase' },
  { value: 'quote', label: 'Quote Required' },
];

const PAGE_SIZE = 12;

// ============================================
// Helpers
// ============================================

function productCTA(p: IntlProduct): { label: string; icon: typeof ShoppingCart; variant: 'primary' | 'outline' } {
  // Inquiry mode - show Request Quote
  if (p.pricing_mode === 'inquiry' || p.purchase_type === 'quote') {
    return { label: 'Request Quote', icon: MessageSquareQuote, variant: 'outline' };
  }
  // Fixed price - show Add to Cart / View Product
  return { label: 'View Product', icon: ShoppingCart, variant: 'primary' };
}

function formatPrice(product: IntlProduct): string | null {
  // Inquiry mode - no price display
  if (product.pricing_mode === 'inquiry') {
    return 'Contact for Price';
  }
  // Fixed price with display_price
  if (product.display_price) {
    const symbol = product.currency_code === 'USD' ? '$' : 
                   product.currency_code === 'EUR' ? '€' :
                   product.currency_code === 'GBP' ? '£' : 
                   product.currency_code || '$';
    return `${symbol}${product.display_price.toLocaleString()}`;
  }
  // Price range
  if (product.price_min && product.price_max && product.price_min !== product.price_max) {
    return `$${product.price_min.toLocaleString()} - $${product.price_max.toLocaleString()}`;
  }
  // Minimum price
  if (product.price_min) {
    return `From $${product.price_min.toLocaleString()}`;
  }
  return null;
}

// ============================================
// Component
// ============================================

export default function IntlShopPageClient() {
  const { locale } = useLanguage();
  const searchParams = useSearchParams();

  // Data
  const [products, setProducts] = useState<IntlProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const initialSpecialty = searchParams.get('specialty') || 'All';
  const initialCategory = searchParams.get('category') || 'All';
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [category, setCategory] = useState(initialCategory);
  const [purchaseType, setPurchaseType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  // Load products
  useEffect(() => {
    setLoading(true);
    getIntlProducts({
      specialty: specialty !== 'All' ? specialty : undefined,
      clinical_category: category !== 'All' ? category : undefined,
      purchase_type: purchaseType !== 'All' ? purchaseType : undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }).then(result => {
      setProducts(result.items);
      setTotal(result.total);
      setLoading(false);
    });
  }, [specialty, category, purchaseType, page]);

  // Client-side search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.display_name.toLowerCase().includes(q) ||
      p.summary?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.base_name?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const activeFilterCount = [
    specialty !== 'All',
    category !== 'All',
    purchaseType !== 'All',
    searchQuery.length > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSpecialty('All');
    setCategory('All');
    setPurchaseType('All');
    setSearchQuery('');
    setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ============================================
  // Render
  // ============================================
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 py-12 pt-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 uppercase tracking-widest">
            <Package className="w-4 h-4" />
            Clinical Equipment
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Equipment &amp; Instruments
          </h1>
          <p className="text-slate-500 font-medium">
            Training-compatible veterinary equipment. Purchase directly or request a quote for custom configurations.
          </p>
        </div>

        {/* Search & Filter Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
              showFilters || activeFilterCount > 0
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Specialty */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Specialty
              </label>
              <select
                value={specialty}
                onChange={(e) => { setSpecialty(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {SPECIALTIES.map(s => (
                  <option key={s} value={s}>{s === 'All' ? 'All Specialties' : s}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>

            {/* Purchase Type */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Purchase Type
              </label>
              <select
                value={purchaseType}
                onChange={(e) => { setPurchaseType(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {PURCHASE_TYPES.map(pt => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-emerald-600 transition"
              >
                <X className="w-3.5 h-3.5" /> Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Specialty Tabs (when filters hidden) */}
      {!showFilters && (
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl mb-8">
          {SPECIALTIES.map(s => (
            <button
              key={s}
              onClick={() => { setSpecialty(s); setPage(0); }}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                specialty === s
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s === 'All' ? 'All Specialties' : s}
            </button>
          ))}
        </div>
      )}

      {/* Results Count */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {filteredProducts.length} of {total} product{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
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
        <div className="py-24 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">No equipment found</h3>
          <p className="text-slate-400 mb-6">Try adjusting your filters or search terms.</p>
          <button
            onClick={clearFilters}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const cta = productCTA(product);
            const price = formatPrice(product);
            return (
              <Link
                key={product.id}
                href={`/${locale}/shop/${product.slug}`}
                className="group rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-white flex flex-col"
              >
                {/* Image */}
                <div className="aspect-square overflow-hidden relative bg-slate-50">
                  {product.cover_image_url ? (
                    <img
                      src={product.cover_image_url}
                      alt={product.display_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-slate-200" />
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {product.is_featured && (
                      <span className="px-2.5 py-1 bg-amber-400 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> Featured
                      </span>
                    )}
                    {product.display_tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-500/90 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {/* Purchase type badge */}
                  {product.purchase_type === 'quote' && (
                    <div className="absolute bottom-3 right-3 bg-amber-50/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-amber-700 border border-amber-100 flex items-center gap-1.5">
                      <MessageSquareQuote className="w-3 h-3" />
                      Quote Only
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  {product.brand && (
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{product.brand}</span>
                  )}
                  <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                    {product.display_name}
                  </h3>
                  {product.summary && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{product.summary}</p>
                  )}

                  {product.recommendation_reason && (
                    <div className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mb-3 line-clamp-1 font-medium">
                      {product.recommendation_reason}
                    </div>
                  )}

                  {/* Price & CTA */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    {price ? (
                      <span className="text-lg font-bold text-slate-900">{price}</span>
                    ) : (
                      <span className="text-sm text-slate-400 font-medium">Contact for pricing</span>
                    )}
                    <span className={`text-sm font-bold flex items-center gap-1 ${
                      cta.variant === 'primary' ? 'text-emerald-600' : 'text-blue-600'
                    } group-hover:underline`}>
                      {cta.label} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-10 h-10 rounded-lg text-sm font-bold transition ${
                page === i
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-16 bg-slate-900 rounded-3xl p-10 md:p-14 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
          Need a Custom Equipment Package?
        </h2>
        <p className="text-slate-400 mb-8 max-w-lg mx-auto">
          We can build a custom equipment package tailored to your training goals and clinic needs.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href={`/${locale}/for-clinics#consultation`}
            className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/20"
          >
            Request a Custom Quote
          </Link>
          <Link
            href={`/${locale}/courses`}
            className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-all"
          >
            Explore Training
          </Link>
        </div>
      </div>
    </div>
  );
}
