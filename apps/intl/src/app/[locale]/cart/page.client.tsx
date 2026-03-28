'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@vetsphere/shared/context/CartContext';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { getLocaleCurrency, formatPrice } from '@vetsphere/shared/lib/currency';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Package, Lock } from 'lucide-react';

interface CartPageClientProps {
  locale: string;
}

export default function CartPageClient({ locale }: CartPageClientProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { cart, updateQuantity, setQuantity, removeFromCart, clearCart, totalAmount, itemCount } = useCart();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const currency = getLocaleCurrency(locale);
  const c = t.cart;

  // 空购物车状态
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <ShoppingBag className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">{c.empty}</h2>
            <p className="mt-2 text-gray-600">{c.emptyDesc}</p>
            <Link
              href={`/${locale}/shop`}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {c.continueShopping}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleCheckout = () => {
    // If not authenticated, redirect to login with cart page as redirect target
    if (!isAuthenticated) {
      router.push(`/${locale}/auth?redirect=${encodeURIComponent(`/${locale}/cart`)}`);
      return;
    }
    // If authenticated, proceed to checkout
    router.push(`/${locale}/checkout`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Login Prompt Banner for Guest Users */}
        {!isAuthenticated && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 mb-1">
                {c.loginRequired}
              </p>
              <p className="text-sm text-amber-700">
                {c.loginToCheckout}{' '}
                <button
                  onClick={() => router.push(`/${locale}/auth?redirect=${encodeURIComponent(`/${locale}/cart`)}`)}
                  className="text-amber-900 font-semibold underline hover:no-underline"
                >
                  {c.loginNow}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{c.title}</h1>
          <p className="mt-1 text-gray-600">{c.itemsCount.replace('{count}', String(itemCount))}</p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {cart.map((item) => (
                  <li key={item.id} className="p-6">
                    <div className="flex gap-6">
                    {/* Product Image */}
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden relative">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="96px"
                          className="w-full h-full object-cover"
                          loading="lazy"
                          quality={75}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            <Link
                              href={`/${locale}/shop/${item.productId || item.id}`}
                              className="hover:text-emerald-600"
                            >
                              {item.name}
                            </Link>
                          </h3>
                          {item.skuCode && (
                            <p className="text-sm text-gray-500 mt-1">{c.sku} {item.skuCode}</p>
                          )}
                          {item.attributeCombination && Object.keys(item.attributeCombination).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {Object.entries(item.attributeCombination).map(([key, value]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.minOrderQuantity && item.minOrderQuantity > 1 && (
                            <p className="text-xs text-amber-600 mt-2">
                              {c.minOrder} {item.minOrderQuantity} units
                            </p>
                          )}
                        </div>
                        <p className="text-lg font-medium text-gray-900">
                          {formatPrice(item.price, currency)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-gray-300 rounded-lg">
                            <button
                              onClick={() => {
                                const newQty = item.quantity - 1;
                                const minQty = item.minOrderQuantity || 1;
                                if (newQty >= minQty) {
                                  updateQuantity(item.id, -1);
                                }
                              }}
                              disabled={item.quantity <= (item.minOrderQuantity || 1)}
                              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 1;
                                const minQty = item.minOrderQuantity || 1;
                                if (newQty >= minQty) {
                                  setQuantity(item.id, newQty);
                                }
                              }}
                              className="w-16 text-center border-x border-gray-300 py-2 focus:outline-none"
                              min={item.minOrderQuantity || 1}
                            />
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-2 hover:bg-gray-100"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={c.remove}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-lg font-medium text-gray-900">
                          {formatPrice(item.price * item.quantity, currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              </ul>
            </div>

            {/* Continue Shopping */}
            <div className="mt-6">
              <Link
                href={`/${locale}/shop`}
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
              >
                <ArrowLeft className="w-4 h-4" />
                {c.continueShopping}
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
              <h2 className="text-lg font-medium text-gray-900 mb-6">{c.orderSummary}</h2>

              <div className="space-y-4">
                <div className="flex justify-between text-gray-600">
                  <span>{c.subtotal.replace('{count}', String(itemCount))}</span>
                  <span>{formatPrice(totalAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{c.shipping}</span>
                  <span className="text-sm">{c.calculatedAtCheckout}</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-lg font-medium text-gray-900">
                    <span>{c.total}</span>
                    <span>{formatPrice(totalAmount, currency)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className="w-full mt-6 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? c.processing : c.proceedToCheckout}
              </button>

              <button
                onClick={() => {
                  if (confirm(c.clearConfirm)) {
                    clearCart();
                  }
                }}
                className="w-full mt-3 px-6 py-2 text-gray-600 hover:text-red-600 text-sm"
              >
                {c.clearCart}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}