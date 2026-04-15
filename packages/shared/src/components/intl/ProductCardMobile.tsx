'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Star, MessageSquareQuote, ShoppingCart, ArrowRight, Heart } from 'lucide-react';
import { getImageUrl, getAccessTokenSafe } from '../../services/supabase';
import { useLanguage } from '../../context/LanguageContext';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';

// Product type from intl-api
interface IntlProductCard {
  id: string;
  product_id: string;
  display_name: string;
  slug: string;
  summary?: string | null;
  pricing_mode: 'fixed' | 'inquiry' | 'inherit' | 'custom';
  display_price: number | null;
  currency_code: string | null;
  purchase_type: 'direct' | 'quote' | null;
  is_featured: boolean;
  display_tags: string[];
  recommendation_reason?: string | null;
  cover_image_url?: string | null;
  brand?: string | null;
  // 是否有多规格变体（需要选择规格后才能加购）
  has_variants?: boolean;
  // 价格区间字段，用于判断多规格 SKU 是否有价格
  price_min?: number | null;
  price_max?: number | null;
  // 基础价格字段（从 products 表继承）
  base_price?: number | null;
  base_pricing_mode?: 'fixed' | 'inquiry';
  // SKU aggregated prices (min/max selling price across all SKUs for each currency)
  sku_price_usd_min?: number | null;
  sku_price_usd_max?: number | null;
  sku_price_jpy_min?: number | null;
  sku_price_jpy_max?: number | null;
  sku_price_thb_min?: number | null;
  sku_price_thb_max?: number | null;
  sku_price_cny_min?: number | null;
  sku_price_cny_max?: number | null;
  // Product specs for display
  specs?: Record<string, any> | null;
  // Minimum order quantity
  min_order_quantity?: number;
}

interface ProductCardMobileProps {
  product: IntlProductCard;
  locale: string;
  onAddToCart?: (product: IntlProductCard) => void;
  onAddToWishlist?: (product: IntlProductCard) => void;
  isInWishlist?: boolean;
}

// 根据产品数据和 locale 获取价格区间 - 返回 min 和 max
export function getPriceRangeForProduct(product: IntlProductCard, locale: string): { minPrice: number | null; maxPrice: number | null; currency: string } {
  // 询价模式产品，返回 null
  if (product.pricing_mode === 'inquiry' || product.purchase_type === 'quote') {
    return { minPrice: null, maxPrice: null, currency: 'USD' };
  }

  // 根据 locale 确定期望的货币
  const expectedCurrency = locale === 'ja' ? 'JPY' :
                           locale === 'th' ? 'THB' :
                           locale === 'zh' || locale === 'cn' ? 'CNY' : 'USD';

  // 优先使用 SKU 价格（对应货币）
  switch (expectedCurrency) {
    case 'JPY':
      if (product.sku_price_jpy_min !== null && product.sku_price_jpy_min !== undefined && product.sku_price_jpy_min > 0) {
        return {
          minPrice: product.sku_price_jpy_min,
          maxPrice: product.sku_price_jpy_max ?? null,
          currency: 'JPY'
        };
      }
      break;
    case 'THB':
      if (product.sku_price_thb_min !== null && product.sku_price_thb_min !== undefined && product.sku_price_thb_min > 0) {
        return {
          minPrice: product.sku_price_thb_min,
          maxPrice: product.sku_price_thb_max ?? null,
          currency: 'THB'
        };
      }
      break;
    case 'CNY':
      if (product.sku_price_cny_min !== null && product.sku_price_cny_min !== undefined && product.sku_price_cny_min > 0) {
        return {
          minPrice: product.sku_price_cny_min,
          maxPrice: product.sku_price_cny_max ?? null,
          currency: 'CNY'
        };
      }
      break;
    default: // USD
      if (product.sku_price_usd_min !== null && product.sku_price_usd_min !== undefined && product.sku_price_usd_min > 0) {
        return {
          minPrice: product.sku_price_usd_min,
          maxPrice: product.sku_price_usd_max ?? null,
          currency: 'USD'
        };
      }
  }

  // 如果没有对应货币的 SKU 价格，尝试回退到 USD SKU 价格
  if (product.sku_price_usd_min !== null && product.sku_price_usd_min !== undefined && product.sku_price_usd_min > 0) {
    return {
      minPrice: product.sku_price_usd_min,
      maxPrice: product.sku_price_usd_max ?? null,
      currency: 'USD'
    };
  }

  // 最后回退到 display_price 或 base_price
  const price = product.display_price ?? product.base_price ?? product.price_min ?? null;
  const currency = product.currency_code || expectedCurrency;

  return { minPrice: price, maxPrice: price, currency };
}

export default function ProductCardMobile({ product, locale, onAddToCart, onAddToWishlist, isInWishlist: propIsInWishlist }: ProductCardMobileProps) {
  const [imageError, setImageError] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Use global wishlist context for persistent state
  const { isInWishlist: globalIsInWishlist, toggleWishlist: globalToggleWishlist } = useWishlist();

  // Use cart context to check if product is already in cart
  const { cart } = useCart();
  const isInCart = cart.some(item =>
    item.productId === product.product_id ||
    item.id === product.product_id ||
    item.productId === product.id ||
    item.id === product.id
  );

  // Get translations
  const { t } = useLanguage();
  const s = t.shop;
  const pd = t.productDetail;

  // Determine if this product is in wishlist (use global state or prop)
  const isInWishlist = globalIsInWishlist(product.product_id) || propIsInWishlist || false;

  // 判断是否为询价产品
  const isInquiry = product.pricing_mode === 'inquiry' || product.purchase_type === 'quote';

  // 判断是否为多规格产品（需要选择规格后才能加购）
  const hasVariants = product.has_variants === true;

  // 检查是否有有效的显示价格
  const hasValidDisplayPrice = product.display_price !== null &&
                                 product.display_price !== undefined &&
                                 product.display_price > 0;

  // 检查是否有有效的价格区间
  const hasValidPriceRange = (product.price_min !== null &&
                               product.price_min !== undefined &&
                               product.price_min > 0) ||
                              (product.price_max !== null &&
                               product.price_max !== undefined &&
                               product.price_max > 0);

  // 所有产品都显示心愿单按钮
  const shouldShowWishlist = true;

  // Handle wishlist toggle - uses global context for persistent state
  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If external handler provided, use it
    if (onAddToWishlist) {
      onAddToWishlist(product);
      return;
    }

    // Check if user is logged in
    const token = await getAccessTokenSafe();
    if (!token) {
      // Not logged in, redirect to auth
      window.location.href = `/${locale}/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setWishlistLoading(true);
    try {
      // Use global toggle - this will automatically sync state across all components
      await globalToggleWishlist(product.product_id, 'product');
    } catch (error) {
      console.error('Wishlist error:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  const formatPrice = () => {
    // 询价产品显示 Contact for Price
    if (isInquiry) return s.contactForPrice;

    // 获取价格区间
    const { minPrice, maxPrice, currency } = getPriceRangeForProduct(product, locale);

    // 获取货币符号
    const symbol = currency === 'USD' ? '$' :
                   currency === 'EUR' ? '€' :
                   currency === 'GBP' ? '£' :
                   currency === 'CNY' ? '¥' :
                   currency === 'JPY' ? '¥' :
                   currency === 'THB' ? '฿' : '$';

    // 格式化单个价格
    const formatSinglePrice = (price: number): string => {
      if (currency === 'JPY') {
        return `${symbol}${Math.round(price).toLocaleString()}`;
      }
      return `${symbol}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // 如果有有效的最低价格
    if (minPrice !== null && minPrice !== undefined && minPrice > 0) {
      // 检查是否有有效的最高价格，且与最低价格不同
      if (maxPrice !== null && maxPrice !== undefined && maxPrice > 0 && maxPrice !== minPrice) {
        // 计算价格差异百分比
        const priceDiffPercent = ((maxPrice - minPrice) / minPrice) * 100;

        // 如果差异 > 20%，显示价格区间
        if (priceDiffPercent > 20) {
          return `${formatSinglePrice(minPrice)} - ${formatSinglePrice(maxPrice)}`;
        }
      }
      // 否则只显示最低价格
      return formatSinglePrice(minPrice);
    }

    return s.contactForPrice;
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isInquiry) {
      // Navigate to product page for quote request
      window.location.href = `/${locale}/shop/${product.slug}`;
      return;
    }

    if (hasVariants) {
      // Navigate to product page to select options
      window.location.href = `/${locale}/shop/${product.slug}`;
      return;
    }

    // Add to cart - the button state will update automatically via cart context
    onAddToCart?.(product);
  };

  const imageUrl = product.cover_image_url && !imageError
    ? getImageUrl(product.cover_image_url) || `https://placehold.co/400x300/F8FAFC/94A3B8?text=${encodeURIComponent(product.display_name.substring(0, 10))}`
    : `https://placehold.co/400x300/F8FAFC/94A3B8?text=${encodeURIComponent(product.display_name.substring(0, 10))}`;

  // Extract top 2 specs for display
  const specEntries: Array<{ key: string; value: string }> = [];
  if (product.specs && typeof product.specs === 'object') {
    const entries = Object.entries(product.specs);
    for (let i = 0; i < Math.min(2, entries.length); i++) {
      const [k, v] = entries[i];
      if (v !== null && v !== undefined && String(v).trim()) {
        specEntries.push({ key: k, value: String(v) });
      }
    }
  }

  const moq = product.min_order_quantity && product.min_order_quantity > 1 ? product.min_order_quantity : null;

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:shadow-slate-200/40 transition-all duration-300 active:scale-[0.98] touch-manipulation">
      {/* Wishlist button - positioned outside Link */}
      <button
        onClick={handleToggleWishlist}
        disabled={wishlistLoading}
        className={`absolute top-2 left-2 z-10 p-1.5 rounded-full shadow-sm transition-all duration-200 ${
          isInWishlist
            ? 'bg-red-500 text-white'
            : 'bg-white/90 backdrop-blur-sm text-slate-400 hover:bg-red-50 hover:text-red-500'
        }`}
        title={isInWishlist ? s.removeFromWishlist : s.addToWishlist}
      >
        {wishlistLoading ? (
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Heart className={`w-3.5 h-3.5 ${isInWishlist ? 'fill-current' : ''}`} />
        )}
      </button>

      <Link
        href={`/${locale}/shop/${product.slug}`}
        className="block"
      >
        {/* Image Container - 4:3 horizontal with white bg and contained image */}
        <div className="relative aspect-[4/3] bg-white overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.display_name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 280px"
            className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            quality={80}
            onError={() => setImageError(true)}
          />

          {/* Featured Badge */}
          {product.is_featured && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-amber-400 text-white text-[10px] font-bold rounded-full shadow-sm">
              <Star className="w-2.5 h-2.5 fill-current" />
              {pd.featured}
            </div>
          )}

          {/* Tags */}
          {product.display_tags.length > 0 && (
            <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
              {product.display_tags.slice(0, 2).map((tag, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 bg-white/95 backdrop-blur-sm text-[9px] font-bold text-slate-600 rounded-full shadow-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Quote Only Badge */}
          {isInquiry && (
            <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-2 py-1 bg-blue-50/95 backdrop-blur-sm text-[9px] font-bold text-blue-700 border border-blue-100 rounded-full">
              <MessageSquareQuote className="w-2.5 h-2.5" />
              {pd.quoteOnly}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2.5 sm:p-3">
          {/* Brand */}
          {product.brand && (
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
              {product.brand}
            </span>
          )}

          {/* Product Name */}
          <h3 className="text-[13px] font-semibold text-slate-900 line-clamp-2 leading-snug mb-1.5">
            {product.display_name}
          </h3>

          {/* Specs Summary - max 2 entries */}
          {specEntries.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {specEntries.map((spec, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-1.5 py-0.5 bg-slate-50 text-[10px] text-slate-500 rounded"
                  title={`${spec.key}: ${spec.value}`}
                >
                  <span className="truncate max-w-[80px]">{spec.value}</span>
                </span>
              ))}
            </div>
          )}

          {/* MOQ indicator */}
          {moq && (
            <p className="text-[10px] text-amber-600 font-medium mb-1.5">
              {s.moqLabel ? s.moqLabel.replace('{qty}', String(moq)) : `MOQ: ${moq}`}
            </p>
          )}

          {/* Price & CTA */}
          <div className="flex items-center justify-between pt-2 mt-auto border-t border-slate-50">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900">{formatPrice()}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {isInquiry ? (
                <button
                  onClick={handleAddToCart}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-200 active:scale-95"
                >
                  <span>{s.getQuote}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : hasVariants ? (
                <button
                  onClick={handleAddToCart}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all duration-200 active:scale-95"
                >
                  <span>{s.selectOptions || 'Options'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className={`
                    flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 active:scale-95
                    ${isInCart
                      ? 'bg-slate-900 text-white'
                      : 'bg-[#00A884] text-white hover:bg-[#008F70] shadow-sm hover:shadow-md'
                    }
                  `}
                >
                  {isInCart ? (
                    <>
                      <ShoppingCart className="w-3 h-3" />
                      <span>{s.added}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-3 h-3" />
                      <span>{s.add}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// Loading skeleton for product card
export function ProductCardMobileSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-slate-50" />
      <div className="p-2.5 sm:p-3 space-y-2">
        <div className="h-2.5 bg-slate-100 rounded w-1/4" />
        <div className="h-3.5 bg-slate-100 rounded w-3/4" />
        <div className="flex gap-1">
          <div className="h-4 bg-slate-50 rounded w-14" />
          <div className="h-4 bg-slate-50 rounded w-12" />
        </div>
        <div className="pt-2 border-t border-slate-50 flex justify-between">
          <div className="h-4 bg-slate-100 rounded w-16" />
          <div className="h-6 bg-slate-100 rounded w-14" />
        </div>
      </div>
    </div>
  );
}
