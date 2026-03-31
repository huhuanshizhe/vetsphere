'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Heart,
  Grid3X3,
  List,
  ArrowUpDown,
  Trash2,
  ShoppingCart,
  Share2,
  ExternalLink,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { formatPrice } from '../lib/currency';
import { getImageUrl } from '../services/supabase';

type ViewMode = 'grid' | 'list';
type SortOption = 'date-desc' | 'date-asc' | 'price-asc' | 'price-desc' | 'name-asc';

interface WishlistProduct {
  id: string;
  product_id: string;
  name?: string;
  display_name?: string;
  slug?: string;
  brand?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  display_price?: number | null;
  base_price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  // SKU aggregated prices (min and max for price range)
  sku_price_usd_min?: number | null;
  sku_price_usd_max?: number | null;
  sku_price_jpy_min?: number | null;
  sku_price_jpy_max?: number | null;
  sku_price_thb_min?: number | null;
  sku_price_thb_max?: number | null;
  sku_price_cny_min?: number | null;
  sku_price_cny_max?: number | null;
  // Legacy fields (for fallback)
  selling_price_usd?: number | null;
  selling_price_jpy?: number | null;
  selling_price_thb?: number | null;
  selling_price_cny?: number | null;
  original_price?: number | null;
  summary?: string | null;
  stock_status?: 'in_stock' | 'out_of_stock' | 'low_stock';
  stock_quantity?: number;
  created_at?: string;
}

interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product_type?: string;
  created_at?: string;
  product?: WishlistProduct | null;
}

interface WishlistPageProps {
  wishlist: WishlistItem[];
  isLoading: boolean;
  locale: string;
  onRemove: (productId: string) => Promise<boolean>;
  onAddToCart?: (productId: string) => void;
  translations: {
    myWishlist: string;
    itemsSaved: string;
    browseEquipment: string;
    empty: string;
    emptyDesc: string;
    gridView: string;
    listView: string;
    sortBy: string;
    dateAdded: string;
    priceHighLow: string;
    priceLowHigh: string;
    nameAZ: string;
    inStock: string;
    outOfStock: string;
    lowStock: string;
    addToCart: string;
    viewDetails: string;
    removeFromWishlist: string;
    shareWishlist: string;
    copyLink: string;
    linkCopied: string;
    selectAll: string;
    selected: string;
    deleteSelected: string;
    addSelectedToCart: string;
    noItemsSelected: string;
    discount: string;
    contactForPrice: string;
  };
}

export function WishlistPage({
  wishlist,
  isLoading,
  locale,
  onRemove,
  onAddToCart,
  translations: t,
}: WishlistPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Get currency based on locale
  const currency = useMemo(() => {
    return locale === 'ja' ? 'JPY' : locale === 'th' ? 'THB' : locale === 'zh' ? 'CNY' : 'USD';
  }, [locale]);

  // Get localized date format
  const dateLocale = useMemo(() => {
    return locale === 'ja' ? 'ja-JP' : locale === 'th' ? 'th-TH' : 'en-US';
  }, [locale]);

  // Sort and filter wishlist
  const sortedWishlist = useMemo(() => {
    const items = [...wishlist];

    return items.sort((a, b) => {
      const productA = (a.product || {}) as Partial<WishlistProduct>;
      const productB = (b.product || {}) as Partial<WishlistProduct>;

      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'date-asc':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'price-asc': {
          const priceA = getPriceValue(productA, currency) || Infinity;
          const priceB = getPriceValue(productB, currency) || Infinity;
          return priceA - priceB;
        }
        case 'price-desc': {
          const priceA = getPriceValue(productA, currency) || 0;
          const priceB = getPriceValue(productB, currency) || 0;
          return priceB - priceA;
        }
        case 'name-asc':
          return (productA.display_name || productA.name || '').localeCompare(productB.display_name || productB.name || '');
        default:
          return 0;
      }
    });
  }, [wishlist, sortBy, currency]);

  // Get price range based on currency - returns { min, max, isRange }
  function getPriceRange(product: Partial<WishlistProduct> | null | undefined, curr: string): { min: number | null; max: number | null; isRange: boolean } {
    if (!product) return { min: null, max: null, isRange: false };

    let minPrice: number | null = null;
    let maxPrice: number | null = null;

    // Get SKU prices based on currency
    switch (curr) {
      case 'JPY':
        minPrice = product.sku_price_jpy_min ?? product.price_min ?? product.display_price ?? product.base_price ?? null;
        maxPrice = product.sku_price_jpy_max ?? product.price_max ?? null;
        break;
      case 'THB':
        minPrice = product.sku_price_thb_min ?? product.price_min ?? product.display_price ?? product.base_price ?? null;
        maxPrice = product.sku_price_thb_max ?? product.price_max ?? null;
        break;
      case 'CNY':
        minPrice = product.sku_price_cny_min ?? product.price_min ?? product.display_price ?? product.base_price ?? null;
        maxPrice = product.sku_price_cny_max ?? product.price_max ?? null;
        break;
      default: // USD
        minPrice = product.sku_price_usd_min ?? product.price_min ?? product.display_price ?? product.base_price ?? null;
        maxPrice = product.sku_price_usd_max ?? product.price_max ?? null;
        break;
    }

    // Determine if this is a price range
    const isRange = minPrice !== null && maxPrice !== null && maxPrice > minPrice;

    return { min: minPrice, max: isRange ? maxPrice : minPrice, isRange };
  }

  // Get single price value (for backward compatibility and sorting)
  function getPriceValue(product: Partial<WishlistProduct> | null | undefined, curr: string): number | null {
    const range = getPriceRange(product, curr);
    return range.min;
  }

  // Format price range for display
  function formatPriceRange(product: Partial<WishlistProduct> | null | undefined, curr: string): string | null {
    const range = getPriceRange(product, curr);
    if (range.min === null || range.min <= 0) return null;

    if (range.isRange && range.max !== null) {
      return `${formatPrice(range.min, curr as any)} - ${formatPrice(range.max, curr as any)}`;
    }
    return formatPrice(range.min, curr as any);
  }

  // Calculate discount percentage
  function getDiscount(original: number | null | undefined, current: number | null | undefined): number | null {
    if (!original || !current || original <= current) return null;
    return Math.round((1 - (current as number) / (original as number)) * 100);
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.size === wishlist.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(wishlist.map(item => item.product_id)));
    }
  };

  // Handle individual selection
  const handleSelect = (productId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedItems(newSelected);
  };

  // Handle remove
  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    await onRemove(productId);
    setRemovingId(null);
    selectedItems.delete(productId);
    setSelectedItems(new Set(selectedItems));
  };

  // Handle batch remove
  const handleBatchRemove = async () => {
    for (const productId of selectedItems) {
      await onRemove(productId);
    }
    setSelectedItems(new Set());
  };

  // Handle share
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/${locale}/user-center?tab=wishlist`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: t.myWishlist,
          text: `${wishlist.length} items in my wishlist`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
    setShowShareModal(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-vs border-t-transparent rounded-full" />
      </div>
    );
  }

  // Empty state
  if (wishlist.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-50 to-red-50 flex items-center justify-center">
          <Heart className="w-12 h-12 text-pink-400" />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">{t.empty}</h3>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          {t.emptyDesc}
        </p>
        <Link
          href={`/${locale}/shop`}
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
        >
          <span>{t.browseEquipment}</span>
          <ExternalLink className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Heart className="w-7 h-7 text-pink-500 fill-pink-500" />
            {t.myWishlist}
          </h2>
          <p className="text-slate-500 mt-1">
            {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} {t.itemsSaved}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Share Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t.shareWishlist}</span>
          </button>

          {/* Browse Button */}
          <Link
            href={`/${locale}/shop`}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
          >
            <span>{t.browseEquipment}</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200">
        {/* Left side - Selection info */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedItems.size === wishlist.length && wishlist.length > 0}
              onChange={handleSelectAll}
              className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-sm font-medium text-slate-700">
              {t.selectAll}
            </span>
          </label>
          {selectedItems.size > 0 && (
            <span className="text-sm text-slate-500">
              {selectedItems.size} {t.selected}
            </span>
          )}
        </div>

        {/* Right side - View mode & Sort */}
        <div className="flex items-center gap-4">
          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-sm border-0 bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="date-desc">{t.dateAdded} ↓</option>
              <option value="date-asc">{t.dateAdded} ↑</option>
              <option value="price-asc">{t.priceLowHigh}</option>
              <option value="price-desc">{t.priceHighLow}</option>
              <option value="name-asc">{t.nameAZ}</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
              title={t.listView}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
              title={t.gridView}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Batch actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200">
          <span className="text-sm font-medium text-emerald-700">
            {selectedItems.size} {t.selected}
          </span>
          <div className="flex-1" />
          {onAddToCart && (
            <button
              onClick={() => selectedItems.forEach(id => onAddToCart?.(id))}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              {t.addSelectedToCart}
            </button>
          )}
          <button
            onClick={handleBatchRemove}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t.deleteSelected}
          </button>
        </div>
      )}

      {/* Product Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
        {sortedWishlist.map((item) => {
          const product = (item.product || {}) as Partial<WishlistProduct>;
          const imageUrl = product.image_url || product.cover_image_url;
          const displayImage = imageUrl ? getImageUrl(imageUrl) : null;
          const productName = product.display_name || product.name || 'Unknown Product';
          const productSlug = product.slug || item.product_id;
          const currentPrice = getPriceValue(product, currency);
          const priceDisplay = formatPriceRange(product, currency);
          const discount = getDiscount(product.original_price, currentPrice);
          const isSelected = selectedItems.has(item.product_id);
          const isRemoving = removingId === item.product_id;

          // Mock stock status (in real app, this would come from product data)
          const stockStatus = product.stock_status || (Math.random() > 0.2 ? 'in_stock' : 'out_of_stock');

          if (viewMode === 'grid') {
            // Grid view card
            return (
              <div
                key={item.id}
                className={`group bg-white rounded-2xl border overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all duration-300 ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200'}`}
              >
                {/* Selection checkbox */}
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelect(item.product_id)}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 bg-white/90 shadow cursor-pointer"
                  />
                </div>

                {/* Product Image */}
                <Link href={`/${locale}/shop/${productSlug}`} className="block">
                  <div className="aspect-square bg-slate-100 relative overflow-hidden">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={productName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
                        <span className="text-5xl">📦</span>
                      </div>
                    )}

                    {/* Discount badge */}
                    {discount && (
                      <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                        -{discount}%
                      </div>
                    )}

                    {/* Out of stock overlay */}
                    {stockStatus === 'out_of_stock' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-white text-slate-800 text-sm font-bold px-3 py-1.5 rounded-lg">
                          {t.outOfStock}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Product Info */}
                <div className="p-4">
                  {/* Brand */}
                  {product.brand && (
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {product.brand}
                    </span>
                  )}

                  {/* Product Name */}
                  <Link href={`/${locale}/shop/${productSlug}`}>
                    <h3 className="font-bold text-slate-900 line-clamp-2 mt-1 hover:text-emerald-600 transition-colors">
                      {productName}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div className="mt-3">
                    {priceDisplay ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-slate-900">
                          {priceDisplay}
                        </span>
                        {product.original_price && currentPrice && product.original_price > currentPrice && (
                          <span className="text-sm text-slate-400 line-through">
                            {formatPrice(product.original_price, currency)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-amber-600">
                        {t.contactForPrice}
                      </span>
                    )}
                  </div>

                  {/* Stock status */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {stockStatus === 'in_stock' && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-emerald-600 font-medium">{t.inStock}</span>
                      </>
                    )}
                    {stockStatus === 'low_stock' && (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-amber-600 font-medium">{t.lowStock}</span>
                      </>
                    )}
                    {stockStatus === 'out_of_stock' && (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-red-600 font-medium">{t.outOfStock}</span>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    {onAddToCart && stockStatus !== 'out_of_stock' && (
                      <button
                        onClick={() => onAddToCart(item.product_id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {t.addToCart}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      disabled={isRemoving}
                      className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50"
                      title={t.removeFromWishlist}
                    >
                      {isRemoving ? (
                        <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          } else {
            // List view card
            return (
              <div
                key={item.id}
                className={`group bg-white rounded-2xl border overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300 ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200'}`}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Selection checkbox */}
                  <div className="flex items-center p-4 sm:py-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelect(item.product_id)}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Product Image */}
                  <Link href={`/${locale}/shop/${productSlug}`} className="sm:w-40 shrink-0">
                    <div className="aspect-square sm:aspect-auto sm:h-40 bg-slate-100 relative overflow-hidden">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={productName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
                          <span className="text-4xl">📦</span>
                        </div>
                      )}

                      {/* Discount badge */}
                      {discount && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                          -{discount}%
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 p-4 sm:py-4 sm:pr-6 flex flex-col">
                    <div className="flex-1">
                      {/* Top row - Brand & Stock */}
                      <div className="flex items-center justify-between mb-2">
                        {product.brand && (
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {product.brand}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          {stockStatus === 'in_stock' && (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-xs text-emerald-600 font-medium">{t.inStock}</span>
                            </>
                          )}
                          {stockStatus === 'out_of_stock' && (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <span className="text-xs text-red-600 font-medium">{t.outOfStock}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Product Name */}
                      <Link href={`/${locale}/shop/${productSlug}`}>
                        <h3 className="font-bold text-slate-900 line-clamp-2 hover:text-emerald-600 transition-colors">
                          {productName}
                        </h3>
                      </Link>

                      {/* Summary */}
                      {product.summary && (
                        <p className="text-sm text-slate-500 line-clamp-2 mt-2">
                          {product.summary}
                        </p>
                      )}

                      {/* Added date */}
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Added {item.created_at ? new Date(item.created_at).toLocaleDateString(dateLocale, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Recently'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom row - Price & Actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                      <div>
                        {priceDisplay ? (
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-slate-900">
                              {priceDisplay}
                            </span>
                            {product.original_price && currentPrice && product.original_price > currentPrice && (
                              <>
                                <span className="text-sm text-slate-400 line-through">
                                  {formatPrice(product.original_price, currency)}
                                </span>
                                <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                                  -{discount}%
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-amber-600">
                            {t.contactForPrice}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {onAddToCart && stockStatus !== 'out_of_stock' && (
                          <button
                            onClick={() => onAddToCart(item.product_id)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            {t.addToCart}
                          </button>
                        )}
                        <Link
                          href={`/${locale}/shop/${productSlug}`}
                          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {t.viewDetails}
                        </Link>
                        <button
                          onClick={() => handleRemove(item.product_id)}
                          disabled={isRemoving}
                          className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50"
                          title={t.removeFromWishlist}
                        >
                          {isRemoving ? (
                            <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600" />
                {t.shareWishlist}
              </h3>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-slate-600">
                Share your wishlist with friends or save the link for later.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/user-center?tab=wishlist`}
                  readOnly
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700"
                />
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      {t.linkCopied}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      {t.copyLink}
                    </>
                  )}
                </button>
              </div>

              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share via...
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
