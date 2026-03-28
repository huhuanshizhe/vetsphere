'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Clock,
  Users,
  Star,
  MapPin,
  Globe,
  Award,
  Heart,
  ShoppingCart,
  Play,
  ArrowRight,
} from 'lucide-react';

interface CourseCardProps {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  cover_image_url?: string;
  specialty?: string;
  level?: string;
  format?: string;
  duration?: string;
  language?: string;
  instructor?: string;
  instructor_title?: string;
  rating?: number;
  reviewCount?: number;
  price?: number;
  originalPrice?: number;
  currency?: string;
  locale: string;
  equipment_count?: number;
}

/**
 * Enhanced Course Card - High Information Density
 */
export const EnhancedCourseCard: React.FC<CourseCardProps> = ({
  id,
  slug,
  title,
  summary,
  cover_image_url,
  specialty,
  level,
  format,
  duration,
  language,
  instructor,
  instructor_title,
  rating = 4.9,
  reviewCount = 128,
  price = 1299,
  originalPrice,
  currency = 'USD',
  locale,
  equipment_count,
}) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);

  const currencySymbol = currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : currency;

  return (
    <div
      className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2"
      onMouseEnter={() => setShowQuickView(true)}
      onMouseLeave={() => setShowQuickView(false)}
    >
      {/* Image Section */}
      <div className="relative h-56 overflow-hidden bg-slate-100">
        {cover_image_url ? (
          <Image
            src={cover_image_url}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            quality={80}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
            <Award className="w-16 h-16 text-slate-400" />
          </div>
        )}

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          {specialty && (
            <span className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
              {specialty}
            </span>
          )}
          {level && (
            <span className="px-3 py-1.5 bg-white/90 text-slate-700 text-xs font-bold rounded-full backdrop-blur-sm shadow-lg">
              {level}
            </span>
          )}
          {equipment_count && equipment_count > 0 && (
            <span className="px-3 py-1.5 bg-blue-500/90 text-white text-xs font-bold rounded-full backdrop-blur-sm shadow-lg flex items-center gap-1">
              <Users className="w-3 h-3" />
              +{equipment_count} Equipment
            </span>
          )}
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
            aria-label="添加到收藏"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
          {showQuickView && (
            <button
              onClick={(e) => {
                e.preventDefault();
                // 打开快速预览弹窗
              }}
              className="p-2 rounded-full bg-white/90 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 backdrop-blur-sm transition-all animate-scale-in"
              aria-label="快速预览"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-white/90 text-xs">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold">{rating}</span>
              <span className="opacity-80">({reviewCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-4">
        {/* Title */}
        <Link href={`/${locale}/courses/${slug}`}>
          <h3 className="text-xl font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors">
            {title}
          </h3>
        </Link>

        {/* Summary */}
        {summary && (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
            {summary}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {instructor && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="truncate max-w-[150px]">{instructor}</span>
            </div>
          )}
          {duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{duration}</span>
            </div>
          )}
          {format && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>{format}</span>
            </div>
          )}
          {language && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{language}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex flex-col">
            {originalPrice && originalPrice > price && (
              <span className="text-xs text-slate-400 line-through">
                {currencySymbol}{originalPrice.toLocaleString()}
              </span>
            )}
            <span className="text-2xl font-bold text-slate-900">
              {currencySymbol}{price.toLocaleString()}
            </span>
          </div>
          <Link
            href={`/${locale}/courses/${slug}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-sm hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Enroll Now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};
