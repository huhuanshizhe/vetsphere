'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@vetsphere/shared/context/CartContext';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { useIntlCartProductImageMap } from '@vetsphere/shared/hooks/useIntlCartProductImageMap';
import { getLocaleCurrency, formatPrice } from '@vetsphere/shared/lib/currency';
import { getImageUrl } from '@vetsphere/shared/services/supabase';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Package,
  Lock,
} from 'lucide-react';

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
  const itemsCountLabel = c.itemsCount.replace('{count}', String(itemCount));
  const subtotalLabel = c.subtotal.replace('{count}', String(itemCount));
  const productImageMap = useIntlCartProductImageMap(cart.map((item) => item.productId));

  // 空购物车状态
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24 pb-16 sm:pt-28 lg:pt-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white px-6 py-12 text-center shadow-xl shadow-slate-200/70 sm:px-10 sm:py-16">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 shadow-inner shadow-emerald-100">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">{c.empty}</h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">{c.emptyDesc}</p>
            <Link
              href={`/${locale}/shop`}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-vs px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-vs/20 transition-all hover:-translate-y-0.5 hover:bg-[#008F6F]"
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
    setLoading(true);
    router.push(`/${locale}/checkout`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24 pb-16 sm:pt-28 lg:pt-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {!isAuthenticated && (
          <div className="mb-8 flex items-start gap-3 rounded-[24px] border border-emerald-100 bg-white/90 p-4 shadow-sm shadow-emerald-100/50 backdrop-blur sm:p-5">
            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm leading-6 text-slate-600">
                Have an account? Log in to use saved addresses and track orders.{' '}
                <button
                  onClick={() => router.push(`/${locale}/auth?redirect=${encodeURIComponent(`/${locale}/cart`)}`)}
                  className="font-semibold text-slate-900 underline decoration-emerald-400 decoration-2 underline-offset-4 hover:text-vs hover:decoration-emerald-600"
                >
                  {c.loginNow || 'Log in'}
                </button>
              </p>
            </div>
          </div>
        )}

        <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-slate-900" />
          <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10">
            <div>
              <div className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
                VetSphere Store
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {c.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{itemsCountLabel}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {subtotalLabel}
                  </p>
                  <p className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
                    {formatPrice(totalAmount, currency)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {c.shipping}
                  </p>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-700">
                    {c.calculatedAtCheckout}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white shadow-lg shadow-slate-300/20">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {c.total}
                  </p>
                  <p className="mt-3 text-xl font-semibold tracking-tight text-white">
                    {formatPrice(totalAmount, currency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
              <div>
                <p className="text-sm font-medium text-slate-500">{c.orderSummary}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                  {formatPrice(totalAmount, currency)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{itemsCountLabel}</p>
              </div>
              <Link
                href={`/${locale}/shop`}
                className="mt-6 inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-200 hover:text-vs"
              >
                <ArrowLeft className="h-4 w-4" />
                {c.continueShopping}
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-12 xl:gap-10">
          <div className="space-y-4 lg:col-span-8 xl:space-y-5">
            {cart.map((item) => {
              const imageUrl =
                (item.productId ? productImageMap[item.productId] : undefined) ||
                getImageUrl(item.imageUrl);

              return (
                <article
                  key={item.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md hover:shadow-slate-200/70 sm:p-6"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start">
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-inner shadow-slate-100 sm:h-32 sm:w-32">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 112px, 128px"
                          className="object-contain p-2"
                          loading="lazy"
                          quality={80}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <Package className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                            <Link
                              href={`/${locale}/shop/${item.productId || item.id}`}
                              className="transition-colors hover:text-vs"
                            >
                              {item.name}
                            </Link>
                          </h3>
                          {item.skuCode && (
                            <p className="mt-2 text-sm text-slate-500">
                              {c.sku} {item.skuCode}
                            </p>
                          )}
                          {item.attributeCombination && Object.keys(item.attributeCombination).length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {Object.entries(item.attributeCombination).map(([key, value]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                                >
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.minOrderQuantity && item.minOrderQuantity > 1 && (
                            <p className="mt-3 text-xs font-medium text-amber-700">
                              {c.minOrder} {item.minOrderQuantity} units
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:min-w-[152px] md:text-right">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Unit Price
                          </p>
                          <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                            {formatPrice(item.price, currency)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
                            <button
                              onClick={() => {
                                const newQty = item.quantity - 1;
                                const minQty = item.minOrderQuantity || 1;
                                if (newQty >= minQty) {
                                  updateQuantity(item.id, -1);
                                }
                              }}
                              disabled={item.quantity <= (item.minOrderQuantity || 1)}
                              className="rounded-xl p-3 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
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
                              className="w-16 border-x border-slate-200 bg-transparent py-3 text-center text-sm font-semibold text-slate-900 focus:outline-none"
                              min={item.minOrderQuantity || 1}
                            />
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="rounded-xl p-3 text-slate-600 transition-colors hover:bg-white"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                            title={c.remove}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>{c.remove}</span>
                          </button>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {c.total}
                          </p>
                          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                            {formatPrice(item.price * item.quantity, currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            <div className="pt-2">
              <Link
                href={`/${locale}/shop`}
                className="inline-flex items-center gap-2 text-sm font-medium text-vs transition-colors hover:text-[#008F6F]"
              >
                <ArrowLeft className="h-4 w-4" />
                {c.continueShopping}
              </Link>
            </div>
          </div>

          <aside className="lg:col-span-4">
            <div className="sticky top-28 space-y-4">
              <div className="overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/40 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold tracking-tight text-white">{c.orderSummary}</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {itemCount}
                  </span>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="flex items-start justify-between gap-4 text-sm text-slate-300">
                    <span>{subtotalLabel}</span>
                    <span className="text-right font-medium text-white">
                      {formatPrice(totalAmount, currency)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4 text-sm text-slate-300">
                    <span>{c.shipping}</span>
                    <span className="max-w-[160px] text-right text-xs leading-5 text-slate-400">
                      {c.calculatedAtCheckout}
                    </span>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-6">
                  <div className="flex items-end justify-between gap-4">
                    <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {c.total}
                    </span>
                    <span className="text-3xl font-semibold tracking-tight text-emerald-300">
                      {formatPrice(totalAmount, currency)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={loading || cart.length === 0}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-vs px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-vs/20 transition-all hover:-translate-y-0.5 hover:bg-[#008F6F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{loading ? c.processing : c.proceedToCheckout}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => {
                    if (confirm(c.clearConfirm)) {
                      clearCart();
                    }
                  }}
                  className="mt-3 w-full rounded-2xl border border-white/10 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {c.clearCart}
                </button>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {c.shipping}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{c.calculatedAtCheckout}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}