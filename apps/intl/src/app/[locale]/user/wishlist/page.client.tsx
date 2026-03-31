'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingCart, Trash2, Loader2, Package, ChevronRight } from 'lucide-react';
import { getLocaleCurrency, formatPrice, Currency } from '@vetsphere/shared/lib/currency';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { useCart } from '@vetsphere/shared/context/CartContext';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';
import { getSessionSafe } from '@vetsphere/shared/services/supabase';

interface WishlistPageClientProps {
  locale: string;
}

interface WishlistItem {
  id: string;
  product_id: string;
  product: {
    id: string;
    name?: string;
    display_name?: string;
    name_en?: string;
    name_ja?: string;
    name_th?: string;
    brand?: string;
    brand_en?: string;
    brand_ja?: string;
    brand_th?: string;
    image_url?: string;
    cover_image_url?: string;
    price?: number;
    price_min?: number | null;
    price_max?: number | null;
    display_price?: number | null;
    sku_price_usd_min?: number | null;
    sku_price_usd_max?: number | null;
    sku_price_jpy_min?: number | null;
    sku_price_jpy_max?: number | null;
    sku_price_thb_min?: number | null;
    sku_price_thb_max?: number | null;
    currency?: string;
    slug?: string;
    slug_en?: string;
    slug_ja?: string;
    slug_th?: string;
    summary?: string;
    description?: string;
    description_en?: string;
    description_ja?: string;
    description_th?: string;
    stock_status?: string;
    stock_quantity?: number;
    has_price?: boolean;
    has_variants?: boolean;
  } | null;
  created_at: string;
}

interface ExchangeRates {
  USD: number;
  JPY: number;
  THB: number;
  CNY: number;
  [key: string]: number;
}

// 汇率转换 - USD为基准货币
const DEFAULT_RATES: ExchangeRates = {
  USD: 1,
  JPY: 149.5,
  THB: 35.2,
  CNY: 7.25,
};

export default function WishlistPageClient({ locale }: WishlistPageClientProps) {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const w = t.wishlist;
  const currency = getLocaleCurrency(locale);

  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_RATES);

  // Fetch exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/exchange-rates');
        if (response.ok) {
          const data = await response.json();
          const rates: ExchangeRates = { ...DEFAULT_RATES };
          if (data.rates) {
            Object.entries(data.rates).forEach(([key, value]: [string, any]) => {
              rates[key] = value.rate;
            });
          }
          setExchangeRates(rates);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      }
    };
    fetchRates();
  }, []);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (!isAuthenticated || !user) {
      router.push(`/${locale}/auth?redirect=/${locale}/user/wishlist`);
      return;
    }

    fetchWishlist();
  }, [isAuthenticated, user, locale, router, authLoading]);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await getSessionSafe();
      const token = session?.access_token;
      if (!token) {
        throw new Error('No session');
      }
      const response = await fetch('/api/wishlist', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wishlist');
      }

      const data = await response.json();
      setWishlist(data.wishlist || []);
    } catch (error: any) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    setRemovingId(productId);
    try {
      const { data: { session } } = await getSessionSafe();
      const token = session?.access_token;
      if (!token) return;
      
      const response = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove from wishlist');
      }

      setWishlist(prev => prev.filter(item => item.product_id !== productId));
    } catch (error: any) {
      console.error('Failed to remove from wishlist:', error);
    } finally {
      setRemovingId(null);
    }
  };

  // Get localized product name
  const getProductName = (item: WishlistItem): string => {
    if (!item.product) return 'Unknown Product';
    const p = item.product;
    switch (locale) {
      case 'ja':
        return p.name_ja || p.name_en || p.display_name || p.name || 'Unknown Product';
      case 'th':
        return p.name_th || p.name_en || p.display_name || p.name || 'Unknown Product';
      case 'zh':
        return p.name || p.display_name || 'Unknown Product';
      default:
        return p.name_en || p.display_name || p.name || 'Unknown Product';
    }
  };

  // Get localized brand
  const getProductBrand = (item: WishlistItem): string | null => {
    if (!item.product) return null;
    const p = item.product;
    switch (locale) {
      case 'ja':
        return p.brand_ja || p.brand_en || p.brand || null;
      case 'th':
        return p.brand_th || p.brand_en || p.brand || null;
      default:
        return p.brand_en || p.brand || null;
    }
  };

  // Get localized slug
  const getProductSlug = (item: WishlistItem): string => {
    if (!item.product) return '';
    const p = item.product;
    switch (locale) {
      case 'ja':
        return p.slug_ja || p.slug_en || p.slug || '';
      case 'th':
        return p.slug_th || p.slug_en || p.slug || '';
      default:
        return p.slug_en || p.slug || '';
    }
  };

  // Get product image URL
  const getProductImage = (item: WishlistItem): string | null => {
    if (!item.product) return null;
    return item.product.cover_image_url || item.product.image_url || null;
  };

  // Convert price from USD to target currency
  const convertPrice = (priceUSD: number, targetCurrency: Currency): number => {
    const rate = exchangeRates[targetCurrency] || 1;
    return priceUSD * rate;
  };

  // Get product price range in display currency
  // Returns { min, max } - if min === max, it's a single price
  const getProductPriceRange = (item: WishlistItem): { min: number; max: number; isRange: boolean } => {
    if (!item.product) return { min: 0, max: 0, isRange: false };
    const p = item.product;

    // Determine which SKU prices to use based on currency
    let minPrice: number | null = null;
    let maxPrice: number | null = null;

    if (currency === 'JPY') {
      // Use JPY SKU prices if available
      if (p.sku_price_jpy_min != null && p.sku_price_jpy_min > 0) {
        minPrice = p.sku_price_jpy_min;
        maxPrice = p.sku_price_jpy_max ?? p.sku_price_jpy_min;
      }
    } else if (currency === 'THB') {
      // Use THB SKU prices if available
      if (p.sku_price_thb_min != null && p.sku_price_thb_min > 0) {
        minPrice = p.sku_price_thb_min;
        maxPrice = p.sku_price_thb_max ?? p.sku_price_thb_min;
      }
    }

    // If no direct currency price, use USD and convert
    if (minPrice === null) {
      if (p.sku_price_usd_min != null && p.sku_price_usd_min > 0) {
        minPrice = convertPrice(p.sku_price_usd_min, currency);
        maxPrice = p.sku_price_usd_max != null ? convertPrice(p.sku_price_usd_max, currency) : minPrice;
      } else if (p.price_min != null && p.price_min > 0) {
        minPrice = convertPrice(p.price_min, currency);
        maxPrice = p.price_max != null && p.price_max > 0 ? convertPrice(p.price_max, currency) : minPrice;
      } else if (p.price != null && p.price > 0) {
        minPrice = convertPrice(p.price, currency);
        maxPrice = minPrice;
      }
    }

    // Ensure valid values
    minPrice = minPrice ?? 0;
    maxPrice = maxPrice ?? minPrice;

    return {
      min: minPrice,
      max: maxPrice,
      isRange: minPrice !== maxPrice && maxPrice > minPrice
    };
  };

  // Get product price in display currency (for backward compatibility)
  const getProductPrice = (item: WishlistItem): number => {
    const range = getProductPriceRange(item);
    return range.min;
  };

  // Format price range for display
  const formatPriceRange = (item: WishlistItem): string => {
    const range = getProductPriceRange(item);
    if (range.isRange) {
      return `${formatPrice(range.min, currency)} - ${formatPrice(range.max, currency)}`;
    }
    return formatPrice(range.min, currency);
  };

  // Check if product has price
  const hasProductPrice = (item: WishlistItem): boolean => {
    if (!item.product) return false;
    const p = item.product;
    const minPrice = p.sku_price_usd_min ?? p.price_min ?? p.price ?? p.display_price;
    return p.has_price !== false && minPrice != null && minPrice > 0;
  };

  const handleAddToCart = async (item: WishlistItem) => {
    if (!item.product) return;
    
    setAddingToCartId(item.product_id);
    try {
      const price = getProductPrice(item);
      const productName = getProductName(item);
      const imageUrl = getProductImage(item) || '';

      await addToCart({
        id: item.product_id,
        productId: item.product.id,
        name: productName,
        price,
        currency,
        type: 'product' as const,
        imageUrl: imageUrl,
        quantity: 1,
        supplierId: undefined,
        supplierName: undefined,
      });
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCartId(null);
    }
  };

  const emptyWishlist = async () => {
    if (confirm(t.common.confirm || 'Are you sure you want to clear your wishlist?')) {
      const { data: { session } } = await getSessionSafe();
      const token = session?.access_token;
      if (!token) return;
      
      setWishlist([]);
      wishlist.forEach(item => {
        fetch('/api/wishlist', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId: item.product_id }),
        }).catch(err => console.error('Failed to remove:', err));
      });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href={`/${locale}`} className="hover:text-slate-700 transition-colors">{t.nav.home}</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/${locale}/user`} className="hover:text-slate-700 transition-colors">{t.userCenter.userCenter}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-medium">{w.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{w.title}</h1>
          <p className="text-slate-500 mt-2">
            {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        {wishlist.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-slate-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-700 mb-3">{w.empty}</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">{w.emptyDesc}</p>
            <Link
              href={`/${locale}/shop`}
              className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/30"
            >
              <Package className="w-5 h-5" />
              {t.userCenter.browseEquipment}
            </Link>
          </div>
        ) : (
          <>
            {/* Actions Bar */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <button
                onClick={emptyWishlist}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t.common.delete}
              </button>
              <Link
                href={`/${locale}/cart`}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/30"
              >
                <ShoppingCart className="w-4 h-4" />
                {t.cart.title}
              </Link>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wishlist.map((item) => {
                const productName = getProductName(item);
                const productBrand = getProductBrand(item);
                const productSlug = getProductSlug(item);
                const productImage = getProductImage(item);
                const hasPrice = hasProductPrice(item);
                
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300 group"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      <Link href={`/${locale}/shop/${productSlug}`}>
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={productName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-16 h-16 text-slate-300" />
                          </div>
                        )}
                      </Link>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromWishlist(item.product_id)}
                        disabled={removingId === item.product_id}
                        className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={w.remove}
                      >
                        {removingId === item.product_id ? (
                          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                        )}
                      </button>
                    </div>

                    {/* Product Info */}
                    <div className="p-5">
                      <div className="mb-3">
                        {productBrand && (
                          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
                            {productBrand}
                          </p>
                        )}
                        <Link
                          href={`/${locale}/shop/${productSlug}`}
                          className="font-bold text-slate-900 hover:text-emerald-600 transition-colors line-clamp-2"
                        >
                          {productName}
                        </Link>
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        {hasPrice ? (
                          <p className="text-xl font-bold text-slate-900">
                            {formatPriceRange(item)}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Contact for price
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={addingToCartId === item.product_id}
                        className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        {addingToCartId === item.product_id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t.common.loading}
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            {w.addToCart}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Continue Shopping Link */}
        <div className="mt-12 text-center">
          <Link
            href={`/${locale}/shop`}
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold hover:bg-emerald-50 px-6 py-3 rounded-xl transition-colors"
          >
            <Package className="w-5 h-5" />
            {t.userCenter.browseEquipment}
          </Link>
        </div>
      </div>
    </div>
  );
}