'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useSiteConfig } from '../../context/SiteConfigContext';
import {
  getIntlHomePageData,
  IntlCourse,
  IntlProduct,
  IntlClinicProgram,
} from '../../services/intl-api';
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
} from 'lucide-react';

// ============================================
// Helpers
// ============================================

/** Resolve CTA label & href for a product based on purchase_type */
function productCTA(p: IntlProduct, locale: string): { label: string; href: string; variant: 'primary' | 'outline' } {
  if (p.purchase_type === 'quote' || p.pricing_mode === 'custom') {
    return { label: 'Request Quote', href: `/${locale}/shop/${p.slug}?action=quote`, variant: 'outline' };
  }
  return { label: 'View Product', href: `/${locale}/shop/${p.slug}`, variant: 'primary' };
}

// ============================================
// Component
// ============================================

export default function IntlUpgradeHomePageClient() {
  const { language } = useLanguage();
  const { siteConfig } = useSiteConfig();
  const locale = language || siteConfig.defaultLocale;

  const [featuredCourses, setFeaturedCourses] = useState<IntlCourse[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<IntlProduct[]>([]);
  const [programs, setPrograms] = useState<IntlClinicProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIntlHomePageData().then(data => {
      setFeaturedCourses(data.featuredCourses);
      setFeaturedProducts(data.featuredProducts);
      setPrograms(data.clinicPrograms);
      setLoading(false);
    });
  }, []);

  // ============================================
  // MODULE 1: Hero
  // ============================================
  const HeroSection = () => (
    <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30" />
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Veterinary Excellence</span>
            </div>

            <h1 className="text-4xl lg:text-[3.5rem] font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              Clinical Training,{' '}
              <span className="text-emerald-600">Equipment</span>,{' '}
              &amp; Clinic Upgrades
            </h1>

            <p className="text-lg text-slate-500 max-w-lg leading-relaxed font-medium">
              Training-led veterinary improvement. Learn practical clinical skills, apply with the right equipment, and upgrade your clinic workflow.
            </p>

            {/* 3 CTAs */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href={`/${locale}/courses`}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Explore Training
              </Link>
              <Link
                href={`/${locale}/shop`}
                className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                Browse Equipment <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/${locale}/for-clinics`}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/10"
              >
                Request a Clinic Upgrade Plan
              </Link>
            </div>

            <div className="pt-6 flex items-center gap-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <span>Training-Led</span>
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
              <span>Practical Implementation</span>
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
              <span>Clinic Support</span>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100 aspect-[4/3]">
              <img
                src="/images/hero-small-animal-clinic.jpg"
                alt="Veterinary Clinical Training and Equipment"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-[2s]"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // ============================================
  // MODULE 2: How It Works / Upgrade Flow
  // ============================================
  const upgradeSteps = [
    { icon: GraduationCap, title: 'Learn with Training', desc: 'Build clinical skills through expert-led veterinary training programs.', href: `/${locale}/courses`, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Wrench, title: 'Apply with Equipment', desc: 'Access the right tools and equipment to implement what you learn.', href: `/${locale}/shop`, color: 'bg-blue-50 text-blue-600' },
    { icon: ClipboardCheck, title: 'Upgrade Your Workflow', desc: 'Integrate training and equipment into your daily clinical practice.', href: `/${locale}/for-clinics`, color: 'bg-purple-50 text-purple-600' },
    { icon: TrendingUp, title: 'Grow with the Right Plan', desc: 'Get a customized upgrade plan tailored to your clinic needs.', href: `/${locale}/for-clinics`, color: 'bg-amber-50 text-amber-600' },
  ];

  const HowItWorksSection = () => (
    <section className="py-20 bg-white border-b border-slate-100">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">How It Works</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">From Training to Clinical Implementation</h3>
          <p className="mt-4 text-slate-500 text-lg">A clear path from learning to doing &mdash; every step connects to the next.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {upgradeSteps.map((step, idx) => (
            <Link key={idx} href={step.href} className="relative flex flex-col items-center text-center group cursor-pointer">
              {idx > 0 && (
                <div className="absolute -left-3 top-10 hidden md:flex items-center">
                  <ChevronRight className="w-6 h-6 text-slate-300" />
                </div>
              )}
              <div className="relative mb-6">
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-black z-10">
                  {idx + 1}
                </div>
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${step.color} transition-transform duration-300 group-hover:scale-110`}>
                  <step.icon className="w-9 h-9" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">{step.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed max-w-[220px]">{step.desc}</p>
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
          <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">Featured Training</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Expert-Led Veterinary Programs</h3>
          <p className="mt-4 text-slate-500 text-lg">Practical clinical training designed for veterinary professionals and clinics.</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden bg-white animate-pulse">
                <div className="h-48 bg-slate-100" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {featuredCourses.slice(0, 6).map((course) => (
              <Link
                key={course.id}
                href={`/${locale}/courses/${course.slug}`}
                className="group rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-white"
              >
                <div className="h-48 overflow-hidden relative bg-slate-100">
                  {course.cover_image_url && (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {course.specialty && (
                      <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                        {course.specialty}
                      </span>
                    )}
                    {course.level && (
                      <span className="px-3 py-1 bg-white/90 text-slate-700 text-xs font-bold rounded-full backdrop-blur-sm">
                        {course.level}
                      </span>
                    )}
                  </div>
                  {course.equipment_count && course.equipment_count > 0 && (
                    <div className="absolute bottom-3 right-3 bg-blue-50/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-blue-700 border border-blue-100 flex items-center gap-1.5">
                      <Wrench className="w-3 h-3" />
                      Equipment Recommended
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  {course.summary && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{course.summary}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {course.format && <span className="px-2 py-0.5 bg-slate-50 rounded-md font-medium">{course.format}</span>}
                    {course.target_audience && <span className="line-clamp-1">{course.target_audience}</span>}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                      View Course <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {featuredCourses.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href={`/${locale}/courses`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
            >
              Explore Training <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );

  // ============================================
  // MODULE 4: Featured Equipment
  // ============================================
  const FeaturedEquipmentSection = () => (
    <section className="py-24 bg-slate-50">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">Clinical Equipment</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Equipment for Your Practice</h3>
          <p className="mt-4 text-slate-500 text-lg">Training-compatible clinical tools and equipment, organized by use case.</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden bg-white animate-pulse">
                <div className="h-48 bg-slate-100" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {featuredProducts.slice(0, 6).map((product) => {
              const cta = productCTA(product, locale);
              return (
                <Link
                  key={product.id}
                  href={`/${locale}/shop/${product.slug}`}
                  className="group rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-white"
                >
                  <div className="h-48 overflow-hidden relative bg-slate-100">
                    {product.cover_image_url && (
                      <img
                        src={product.cover_image_url}
                        alt={product.display_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-4 left-4 flex gap-2">
                      {product.display_tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-500/90 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {product.purchase_type === 'quote' && (
                      <div className="absolute bottom-3 right-3 bg-amber-50/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-amber-700 border border-amber-100">
                        Quote Available
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                      {product.display_name}
                    </h3>
                    {product.summary && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{product.summary}</p>
                    )}
                    {product.brand && (
                      <span className="text-xs text-slate-400 font-medium">{product.brand}</span>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      {product.display_price ? (
                        <span className="text-lg font-bold text-slate-900">
                          {product.currency_code === 'USD' ? '$' : ''}{product.display_price.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400 font-medium">
                          {cta.label === 'Request Quote' ? 'Contact for pricing' : ''}
                        </span>
                      )}
                      <span className="text-sm font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                        {cta.label} <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {featuredProducts.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href={`/${locale}/shop`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 transition-all"
            >
              Browse Equipment <ArrowRight className="w-4 h-4" />
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
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest">For Clinics</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Clinic Upgrade Programs
            </h3>
            <p className="text-lg text-slate-500 leading-relaxed">
              Comprehensive plans for clinic owners and teams &mdash; combining the right training, equipment selection, and implementation support for your practice.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href={`/${locale}/for-clinics`}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/10"
              >
                See Clinic Programs
              </Link>
              <Link
                href={`/${locale}/for-clinics#consultation`}
                className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 transition-all"
              >
                Request Consultation
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {programs.length > 0 ? (
              programs.slice(0, 3).map((prog) => (
                <div key={prog.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-shadow">
                  <h4 className="text-lg font-bold text-slate-900 mb-1">{prog.name}</h4>
                  {prog.tagline && <p className="text-sm text-slate-500 mb-3">{prog.tagline}</p>}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {prog.target_clinic_type && (
                      <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium">
                        <Hospital className="w-3 h-3 inline mr-1" />{prog.target_clinic_type}
                      </span>
                    )}
                    {prog.support_level && (
                      <span className="px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-medium">
                        {prog.support_level}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center">
                <Hospital className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Custom training + equipment plans for your clinic</p>
                <Link href={`/${locale}/for-clinics`} className="mt-4 inline-block text-emerald-600 font-bold text-sm hover:underline">
                  Learn More <ArrowRight className="w-3 h-3 inline" />
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
    { icon: GraduationCap, title: 'Training-Led Recommendations', desc: 'Equipment recommendations backed by clinical training expertise.', color: 'bg-blue-50 text-blue-600' },
    { icon: Shield, title: 'Practical Equipment Selection', desc: 'Curated selection focused on real clinical needs, not upselling.', color: 'bg-purple-50 text-purple-600' },
    { icon: HeartHandshake, title: 'Advisory Support', desc: 'Dedicated team to help you choose the right path for your clinic.', color: 'bg-orange-50 text-orange-600' },
    { icon: Headphones, title: 'Built for Veterinary Teams', desc: 'Everything designed specifically for veterinary professionals and clinics.', color: 'bg-emerald-50 text-emerald-600' },
  ];

  const TrustSection = () => (
    <section className="py-24 bg-slate-50">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">Why VetSphere</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Trusted by Veterinary Professionals</h3>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustPoints.map((tp, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg transition-shadow duration-300 text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto ${tp.color}`}>
                <tp.icon className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-3">{tp.title}</h4>
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
    <section className="py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-transparent" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Ready to Upgrade Your Practice?
            </h2>
            <p className="text-slate-400 text-lg">
              Start with training, apply with equipment, or talk to our team about a custom plan.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              <Link
                href={`/${locale}/courses`}
                className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-bold text-base hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/20"
              >
                Start with Training
              </Link>
              <Link
                href={`/${locale}/shop`}
                className="px-10 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold text-base hover:bg-white/20 transition-all"
              >
                Browse Equipment
              </Link>
              <Link
                href={`/${locale}/for-clinics#consultation`}
                className="px-10 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold text-base hover:bg-white/20 transition-all"
              >
                Talk to Our Team
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
    <div className="flex flex-col bg-white">
      <HeroSection />
      <HowItWorksSection />
      <FeaturedTrainingSection />
      <FeaturedEquipmentSection />
      <ForClinicsSection />
      <TrustSection />
      <BottomCTASection />
    </div>
  );
}
