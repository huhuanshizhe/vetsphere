'use client';

import React, { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '../../context/LanguageContext';
import { useSiteConfig } from '../../context/SiteConfigContext';
import {
  getIntlHomePageData,
  IntlCourse,
  IntlProduct,
  IntlClinicProgram,
} from '../../services/intl-api';
import { getPriceRangeForProduct } from '../../components/intl/ProductCardMobile';
import { SuccessStories } from '../../components/home/SuccessStories';
import { LearningPaths } from '../../components/home/LearningPaths';
import {
  GraduationCap,
  Wrench,
  ClipboardCheck,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Shield,
  HeartHandshake,
  Headphones,
  Hospital,
  Sparkles,
  Zap,
  Award,
  Users,
  CheckCircle2,
} from 'lucide-react';

// ============================================
// Helpers
// ============================================

// ============================================
// Hero Section - Clean & Professional
// ============================================
const HeroSection = memo(function HeroSection({ locale, t }: { locale: string; t: any }) {
  const h = t.intlUpgradeHome;
  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content - Text */}
          <div className="space-y-8 animate-slide-up">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold text-emerald-300 uppercase tracking-wider">{h.heroTag}</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight">
                {h.heroTitle}
              </h1>
              <div className="flex items-center gap-4 text-lg text-slate-300 font-medium">
                <p>{h.heroSubtitle}</p>
                <span className="hidden sm:inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                <p className="max-w-md">{h.heroSubtitleLine2}</p>
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href={`/${locale}/courses`}
                className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-base transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3"
              >
                {h.heroCTA1}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </Link>
              <Link
                href={`/${locale}/shop`}
                className="group px-8 py-4 bg-white/10 backdrop-blur-xl text-white border border-white/20 rounded-xl font-bold text-base hover:bg-white/20 transition-all hover:-translate-y-1 flex items-center gap-3"
              >
                {h.heroCTA2}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2.5 text-slate-400">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold">{h.heroBadge1}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex items-center gap-2.5 text-slate-400">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold">{h.heroBadge2}</span>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Visual */}
          <div className="relative animate-fade-in">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 aspect-[4/3] group">
              <Image
                src="/images/hero-vet-training.png"
                alt="Veterinary Clinical Training and Equipment"
                fill
                sizes="(max-width: 1024px) 100vw, 720px"
                priority
                quality={90}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s] ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
              
              {/* Floating Stats Card */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-black text-white">{h.heroOverlayCount}</p>
                      <p className="text-xs text-slate-300 font-medium">{h.heroOverlayLabel}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

// ============================================
// Main Component
// ============================================

export default function IntlUpgradeHomePageClient() {
  const { language, t } = useLanguage();
  const { siteConfig } = useSiteConfig();
  const locale = language || siteConfig.defaultLocale;
  const h = t.intlUpgradeHome;

  const [featuredCourses, setFeaturedCourses] = useState<IntlCourse[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<IntlProduct[]>([]);
  const [programs, setPrograms] = useState<IntlClinicProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIntlHomePageData(locale).then(data => {
      setFeaturedCourses(data.featuredCourses);
      setFeaturedProducts(data.featuredProducts);
      setPrograms(data.clinicPrograms);
      setLoading(false);
    });
  }, [locale]);

  // ============================================
  // MODULE 2: Success Stories (社会证明)
  // ============================================
  
  // ============================================
  // MODULE 3: Learning Paths (用户角色分流)
  // ============================================
  
  // ============================================
  // MODULE 4: How It Works / Upgrade Flow
  // ============================================
  const upgradeSteps = [
    { icon: GraduationCap, title: h.step1Title, desc: h.step1Desc, href: `/${locale}/courses`, color: 'from-emerald-50 to-emerald-100 text-emerald-600 border-emerald-200' },
    { icon: Wrench, title: h.step2Title, desc: h.step2Desc, href: `/${locale}/shop`, color: 'from-blue-50 to-blue-100 text-blue-600 border-blue-200' },
    { icon: ClipboardCheck, title: h.step3Title, desc: h.step3Desc, href: `/${locale}/for-clinics`, color: 'from-purple-50 to-purple-100 text-purple-600 border-purple-200' },
    { icon: TrendingUp, title: h.step4Title, desc: h.step4Desc, href: `/${locale}/for-clinics`, color: 'from-amber-50 to-amber-100 text-amber-600 border-amber-200' },
  ];

  const HowItWorksSection = () => (
    <section className="py-24 bg-white border-b border-slate-100 vs-pattern">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="section-badge mb-6 inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {h.upgradePathTag}
          </div>
          <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">{h.upgradePathTitle}</h3>
          <p className="mt-4 text-xl text-slate-500">{h.upgradePathSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {upgradeSteps.map((step, idx) => (
            <Link key={idx} href={step.href} className="relative flex flex-col items-center text-center group cursor-pointer">
              {idx > 0 && (
                <div className="absolute -left-3 top-10 hidden lg:flex items-center">
                  <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </div>
              )}
              <div className="relative mb-6">
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-black z-10 shadow-lg">
                  {idx + 1}
                </div>
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center bg-gradient-to-br ${step.color} transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}>
                  <step.icon className="w-11 h-11" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">{step.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed max-w-[240px]">{step.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );

  // ============================================
  // MODULE 3: Featured Training
  // ============================================
  const FeaturedTrainingSection = () => (
    <section className="py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="section-badge mb-6 inline-flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            {h.featuredTag}
          </div>
          <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">{h.featuredTitle}</h3>
          <p className="mt-4 text-xl text-slate-500">{h.featuredSubtitle}</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-3xl border border-slate-200 overflow-hidden bg-white animate-pulse">
                <div className="h-56 bg-slate-100" />
                <div className="p-6 space-y-3">
                  <div className="h-6 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCourses.slice(0, 6).map((course, idx) => (
              <Link
                key={course.id}
                href={`/${locale}/courses/${course.slug}`}
                className="group gradient-card rounded-3xl overflow-hidden animate-scale-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="h-56 overflow-hidden relative bg-slate-100">
                  {course.cover_image_url && (
                    <Image
                      src={course.cover_image_url}
                      alt={course.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 320px"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                      quality={80}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 flex gap-2 z-10">
                    {course.specialty && (
                      <span className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
                        {course.specialty}
                      </span>
                    )}
                    {course.level && (
                      <span className="px-3 py-1.5 bg-white/90 text-slate-700 text-xs font-bold rounded-full backdrop-blur-sm shadow-lg">
                        {course.level}
                      </span>
                    )}
                  </div>
                  {course.equipment_count && course.equipment_count > 0 && (
                    <div className="absolute bottom-4 right-4 bg-blue-500/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-white border border-blue-400 flex items-center gap-1.5 shadow-lg">
                      <Wrench className="w-3 h-3" />
                      {h.equipmentBadge}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  {course.summary && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{course.summary}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                    {course.format && <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-medium">{course.format}</span>}
                    {course.target_audience && <span className="line-clamp-1">{course.target_audience}</span>}
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-600 group-hover:underline flex items-center gap-1.5 transition-all">
                      {h.learnMore} <ArrowRight className="w-4 h-4 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {featuredCourses.length > 0 && (
          <div className="mt-16 text-center">
            <Link
              href={`/${locale}/courses`}
              className="group inline-flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold text-base hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 hover:-translate-y-1"
            >
              {h.viewAllTraining} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );

  // ============================================
  // MODULE 4: Featured Equipment
  // ============================================

  // Format product price using the same logic as shop page
  const formatProductPrice = (product: IntlProduct): string => {
    // Inquiry/quote products
    if (product.pricing_mode === 'inquiry' || product.purchase_type === 'quote') {
      return t.shop.contactForPrice;
    }

    const { minPrice, maxPrice, currency } = getPriceRangeForProduct(product as any, locale);

    // Currency symbols
    const symbol = currency === 'USD' ? '$' :
                   currency === 'EUR' ? '€' :
                   currency === 'GBP' ? '£' :
                   currency === 'CNY' ? '¥' :
                   currency === 'JPY' ? '¥' :
                   currency === 'THB' ? '฿' : '$';

    // Format single price
    const formatSinglePrice = (price: number): string => {
      if (currency === 'JPY') {
        return `${symbol}${Math.round(price).toLocaleString()}`;
      }
      return `${symbol}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (minPrice !== null && minPrice !== undefined && minPrice > 0) {
      // Check if we should show price range (>20% difference)
      if (maxPrice !== null && maxPrice !== undefined && maxPrice > 0 && maxPrice !== minPrice) {
        const priceDiffPercent = ((maxPrice - minPrice) / minPrice) * 100;
        if (priceDiffPercent > 20) {
          return `${formatSinglePrice(minPrice)} - ${formatSinglePrice(maxPrice)}`;
        }
      }
      return formatSinglePrice(minPrice);
    }

    return t.shop.contactForPrice;
  };

  const FeaturedEquipmentSection = () => (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white vs-pattern">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="section-badge mb-6 inline-flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            {h.toolkitTag}
          </div>
          <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">{h.toolkitTitle}</h3>
          <p className="mt-4 text-xl text-slate-500">{h.toolkitSubtitle}</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-3xl border border-slate-200 overflow-hidden bg-white animate-pulse">
                <div className="h-56 bg-slate-100" />
                <div className="p-6 space-y-3">
                  <div className="h-6 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-101 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.slice(0, 6).map((product, idx) => {
              const priceDisplay = formatProductPrice(product);
              return (
                <Link
                  key={product.id}
                  href={`/${locale}/shop/${product.slug}`}
                  className="group gradient-card rounded-3xl overflow-hidden animate-scale-in"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="h-56 overflow-hidden relative bg-slate-100">
                    {product.cover_image_url && (
                      <Image
                        src={product.cover_image_url}
                        alt={product.display_name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 320px"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                        quality={80}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4 flex gap-2 z-10">
                      {product.display_tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="px-3 py-1.5 bg-blue-500/95 text-white text-xs font-bold rounded-full backdrop-blur-sm shadow-lg">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {product.purchase_type === 'quote' && (
                      <div className="absolute bottom-4 right-4 bg-amber-500/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-white border border-amber-400 shadow-lg">
                        {t.shop.contactForPrice}
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                      {product.display_name}
                    </h3>
                    {product.summary && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4">{product.summary}</p>
                    )}
                    {product.brand && (
                      <span className="text-xs text-slate-400 font-medium">{product.brand}</span>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xl font-bold text-slate-900">
                        {priceDisplay}
                      </span>
                      <span className="text-sm font-bold text-emerald-600 group-hover:underline flex items-center gap-1.5 transition-all">
                        {h.learnMore} <ArrowRight className="w-4 h-4 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {featuredProducts.length > 0 && (
          <div className="mt-16 text-center">
            <Link
              href={`/${locale}/shop`}
              className="group inline-flex items-center gap-3 px-10 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 hover:border-slate-300 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              {h.browseAll} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );

  // ============================================
  // MODULE 5: For Clinics / Programs
  // ============================================
  const ForClinicsSection = () => (
    <section className="py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="section-badge inline-flex items-center gap-2">
              <Hospital className="w-4 h-4" />
              {t.forClinics.heroTag}
            </div>
            <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              {t.forClinics.heroTitle}
            </h3>
            <p className="text-xl text-slate-500 leading-relaxed">
              {t.forClinics.heroSubtitle}
            </p>

            {/* Key Benefits */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{h.trustFeat1}</p>
                  <p className="text-sm text-slate-500">{h.trustFeat1Desc}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{h.trustFeat2}</p>
                  <p className="text-sm text-slate-500">{h.trustFeat2Desc}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{h.trustFeat3}</p>
                  <p className="text-sm text-slate-500">{h.trustFeat3Desc}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{h.trustFeat4}</p>
                  <p className="text-sm text-slate-500">{h.trustFeat4Desc}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href={`/${locale}/for-clinics`}
                className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-bold text-base hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-xl shadow-emerald-900/20 hover:shadow-emerald-500/30 hover:-translate-y-1 flex items-center gap-3"
              >
                {t.forClinics.heroCTA}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            {programs.length > 0 ? (
              programs.slice(0, 3).map((prog, idx) => (
                <div key={prog.id} className="gradient-card rounded-3xl p-6 hover:shadow-xl transition-all duration-300 animate-scale-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Hospital className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-slate-900 mb-1">{prog.name}</h4>
                      {prog.tagline && <p className="text-sm text-slate-500 mb-3">{prog.tagline}</p>}
                      <div className="flex flex-wrap gap-2">
                        {prog.target_clinic_type && (
                          <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium text-xs flex items-center gap-1.5">
                            <Hospital className="w-3 h-3" />{prog.target_clinic_type}
                          </span>
                        )}
                        {prog.support_level && (
                          <span className="px-3 py-1.5 bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-700 font-medium text-xs">
                            {prog.support_level}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="gradient-card rounded-3xl p-10 text-center">
                <Hospital className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-slate-900 mb-2">{t.forClinics.heroTitle}</h4>
                <p className="text-slate-500 mb-4">{t.forClinics.heroSubtitle}</p>
                <Link href={`/${locale}/for-clinics`} className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline">
                  {h.learnMore} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  // ============================================
  // MODULE 6: Trust / Why VetSphere
  // ============================================
  const trustPoints = [
    { icon: GraduationCap, title: h.trustFeat1, desc: h.trustFeat1Desc, color: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200' },
    { icon: Shield, title: h.trustFeat2, desc: h.trustFeat2Desc, color: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-purple-200' },
    { icon: HeartHandshake, title: h.trustFeat3, desc: h.trustFeat3Desc, color: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-orange-200' },
    { icon: Headphones, title: h.trustFeat4, desc: h.trustFeat4Desc, color: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-200' },
  ];

  const TrustSection = () => (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white vs-pattern">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="section-badge mb-6 inline-flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {h.trustTag}
          </div>
          <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">{h.trustTitle}</h3>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustPoints.map((tp, idx) => (
            <div key={idx} className="glass-card rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 text-center group hover:-translate-y-2">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto ${tp.color} shadow-lg group-hover:scale-110 transition-transform`}>
                <tp.icon className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-900 text-lg mb-3">{tp.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{tp.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // ============================================
  // MODULE 7: Bottom CTA
  // ============================================
  const BottomCTASection = () => (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[128px]" />
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 relative z-10">
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-[3rem] p-12 md:p-20 text-center border border-white/10 shadow-2xl">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
              {h.ctaTitle}
            </h2>
            <p className="text-xl text-slate-300 leading-relaxed">
              {h.ctaSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              <Link
                href={`/${locale}/courses`}
                className="group px-10 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-bold text-base hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-xl shadow-emerald-900/30 hover:shadow-emerald-500/50 hover:-translate-y-1 flex items-center gap-3"
              >
                {h.ctaCTA1}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href={`/${locale}/shop`}
                className="group px-10 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/20 rounded-2xl font-bold text-base hover:bg-white/20 hover:border-white/30 transition-all flex items-center gap-3"
              >
                {h.ctaCTA2}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      <div className="flex flex-col bg-white">
        <HeroSection locale={locale} t={t} />
        
        {/* Success Stories - Social Proof */}
        <SuccessStories />
        
        {/* Learning Paths - Role Selection */}
        <LearningPaths locale={locale} />
        
        {/* Main Sections */}
        <HowItWorksSection />
        <FeaturedTrainingSection />
        <FeaturedEquipmentSection />
        <ForClinicsSection />
        <TrustSection />
        <BottomCTASection />
      </div>
    </>
  );
}