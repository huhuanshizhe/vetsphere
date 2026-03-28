'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingCart,
  Heart,
  MessageSquareQuote,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Truck,
} from 'lucide-react';

interface ProductCardProps {
  id: string;
  slug: string;
  display_name: string;
  summary?: string;
  cover_image_url?: string;
  brand?: string;
  pricing_mode: 'fixed' | 'inquiry' | 'custom';
  price?: number;
  originalPrice?: number;
  currency?: string;
  locale: string;
  display_tags?: string[];
  purchase_type?: 'direct' | 'quote';
  features?: string[];
  warranty?: string;
  shipping?: string;
}

/**
 * Enhanced Product Card - High Information Density
 */
export const EnhancedProductCard: React.FC<ProductCardProps> = ({
  id,
  slug,
  display_name,
  summary,
  cover_image_url,
  brand,
  pricing_mode,
  price = 5000,
  originalPrice,
  currency = 'USD',
  locale,
  display_tags = [],
  purchase_type = 'direct',
  features = [],
  warranty = '2 年质保',
  shipping = '免费配送',
}) => {
  const [isWishlisted, setIsWishlisted] = useState(false);

  const currencySymbol = currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : currency === 'JPY' ? '¥' : currency === 'THB' ? '฿' : '$';
  const isInquiry = pricing_mode === 'inquiry' || purchase_type === 'quote';

  return (
    <div className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2">
      {/* Image Section */}
      <div className="relative h-56 overflow-hidden bg-slate-100">
        {cover_image_url ? (
          <Image
            src={cover_image_url}
            alt={display_name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            quality={80}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
            <Zap className="w-16 h-16 text-slate-400" />
          </div>
        )}

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          {display_tags.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 bg-blue-500/90 text-white text-xs font-bold rounded-full backdrop-blur-sm shadow-lg"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsWishlisted(!isWishlisted);
            }}
            className={`p-2 rounded-full backdrop-blur-sm transition-all ${
              isWishlisted
                ? 'bg-red-500 text-white'
                : 'bg-white/90 text-slate-600 hover:bg-red-50 hover:text-red-500'
            }`}
            aria-label="Add to wishlist"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Inquiry Badge */}
        {isInquiry && (
          <div className="absolute bottom-4 right-4 bg-amber-500/95 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-white border border-amber-400 shadow-lg flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4" />
            询价产品
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-4">
        {/* Brand */}
        {brand && (
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            {brand}
          </span>
        )}

        {/* Title */}
        <Link href={`/${locale}/shop/${slug}`}>
          <h3 className="text-xl font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors">
            {display_name}
          </h3>
        </Link>

        {/* Summary */}
        {summary && (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
            {summary}
          </p>
        )}

        {/* Features */}
        {features.length > 0 && (
          <div className="space-y-2">
            {features.slice(0, 3).map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600">{feature}</span>
              </div>
            ))}
          </div>
        )}

        {/* Service Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {warranty}
          </span>
          {shipping && (
            <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              {shipping}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex flex-col">
            {originalPrice && originalPrice > price && !isInquiry && (
              <span className="text-xs text-slate-400 line-through">
                {currencySymbol}{originalPrice.toLocaleString()}
              </span>
            )}
            <span className="text-2xl font-bold text-slate-900">
              {isInquiry ? (
                <span className="text-lg text-slate-500">询价</span>
              ) : (
                `${currencySymbol}${price.toLocaleString()}`
              )}
            </span>
          </div>
          <Link
            href={`/${locale}/shop/${slug}`}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-95 ${
              isInquiry
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500'
            }`}
          >
            {isInquiry ? (
              <>
                <MessageSquareQuote className="w-4 h-4" />
                获取报价
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                Buy Now
              </>
            )}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};
