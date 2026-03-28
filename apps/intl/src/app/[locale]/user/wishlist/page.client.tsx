'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingCart, Trash2, Loader2, Package, ChevronRight } from 'lucide-react';
import { getLocaleCurrency, formatPrice } from '@vetsphere/shared/lib/currency';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { useCart } from '@vetsphere/shared/context/CartContext';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';

interface WishlistPageClientProps {
  locale: string;
}

interface WishlistItem {
  id: string;
  product_id: string;
  product: {
    id: string;
    name: string;
    brand?: string;
    image_url: string;
    display_price?: number;
    selling_price_usd?: number;
    selling_price_jpy?: number;
    selling_price_thb?: number;
    slug: string;
  };
  created_at: string;
}

export default function WishlistPageClient({ locale }: WishlistPageClientProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const w = t.wishlist;
  const currency = getLocaleCurrency(locale);

  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push(`/${locale}/auth?redirect=/${locale}/user/wishlist`);
      return;
    }

    fetchWishlist();
  }, [isAuthenticated, user, locale, router]);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
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
      const token = localStorage.getItem('accessToken');
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

  const handleAddToCart = async (item: WishlistItem) => {
    setAddingToCartId(item.product_id);
    try {
      // Get price based on locale
      let price = item.product.display_price || 0;
      if (locale === 'en' && item.product.selling_price_usd) {
        price = item.product.selling_price_usd;
      } else if (locale === 'ja' && item.product.selling_price_jpy) {
        price = item.product.selling_price_jpy;
      } else if (locale === 'th' && item.product.selling_price_thb) {
        price = item.product.selling_price_thb;
      }

      await addToCart({
        id: item.product_id,
        productId: item.product.id,
        name: item.product.name,
        price,
        currency,
        type: 'product' as const,
        imageUrl: item.product.image_url,
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

  const getProductPrice = (item: WishlistItem): number => {
    if (locale === 'ja' && item.product.selling_price_jpy) {
      return item.product.selling_price_jpy;
    }
    if (locale === 'th' && item.product.selling_price_thb) {
      return item.product.selling_price_thb;
    }
    if (locale === 'en' && item.product.selling_price_usd) {
      return item.product.selling_price_usd;
    }
    return item.product.display_price || 0;
  };

  const emptyWishlist = () => {
    if (confirm(t.common.confirm)) {
      setWishlist([]);
      wishlist.forEach(item => {
        fetch('/api/wishlist', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId: item.product_id }),
        }).catch(err => console.error('Failed to remove:', err));
      });
    }
  };

  if (loading) {
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
              {wishlist.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300 group"
                >
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <Link href={`/${locale}/shop/${item.product.slug}`}>
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
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
                      {item.product.brand && (
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
                          {item.product.brand}
                        </p>
                      )}
                      <Link
                        href={`/${locale}/shop/${item.product.slug}`}
                        className="font-bold text-slate-900 hover:text-emerald-600 transition-colors line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <p className="text-xl font-bold text-slate-900">
                        {formatPrice(getProductPrice(item), currency)}
                      </p>
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
              ))}
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