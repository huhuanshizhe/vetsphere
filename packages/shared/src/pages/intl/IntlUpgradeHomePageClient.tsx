'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../services/api';
import { Course } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSiteConfig } from '../../context/SiteConfigContext';
import {
  GraduationCap,
  Wrench,
  ClipboardCheck,
  TrendingUp,
  ArrowRight,
  MapPin,
  Calendar,
  MessageSquare,
  Truck,
  Cpu,
  ChevronRight,
} from 'lucide-react';

export default function IntlUpgradeHomePageClient() {
  const { t, language } = useLanguage();
  const { siteConfig } = useSiteConfig();
  const locale = language || siteConfig.defaultLocale;
  const h = (t as any).intlUpgradeHome || {};

  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [equipmentCounts, setEquipmentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    api.getCourses().then(courses => {
      const published = courses.filter(c => c.status === 'Published').slice(0, 3);
      setFeaturedCourses(published);

      // Fetch equipment counts in parallel
      Promise.all(
        published.map(c =>
          fetch(`/api/courses/${c.id}/products`)
            .then(r => r.ok ? r.json() : { relations: [] })
            .then(data => ({ id: c.id, count: (data.relations || []).length }))
            .catch(() => ({ id: c.id, count: 0 }))
        )
      ).then(results => {
        const counts: Record<string, number> = {};
        results.forEach(r => { counts[r.id] = r.count; });
        setEquipmentCounts(counts);
      });
    });
  }, []);

  const getLocalizedTitle = (course: Course) => {
    if (language === 'th') return course.title_th || course.title;
    if (language === 'ja') return course.title_ja || course.title;
    if (language === 'zh') return course.title_zh || course.title;
    return course.title;
  };

  const getLocalizedCity = (course: Course) => {
    const loc = course.location;
    if (language === 'th') return loc.city_th || loc.city;
    if (language === 'ja') return loc.city_ja || loc.city;
    if (language === 'zh') return loc.city_zh || loc.city;
    return loc.city;
  };

  // Clinical workflow categories from site config
  const clinicalCategories = siteConfig.shopCategories?.dimensions?.find(
    d => d.key === 'clinicalCategory'
  )?.categories || [];

  const categoryIcons: Record<string, string> = {
    'imaging-diagnostics': '\uD83D\uDD2C',
    'surgery-anesthesia': '\u2695\uFE0F',
    'in-house-lab': '\uD83E\uDDEA',
    'daily-supplies': '\uD83D\uDCE6',
    'course-equipment': '\uD83C\uDF93',
  };

  const upgradeSteps = [
    { icon: GraduationCap, title: h.step1Title, desc: h.step1Desc, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Wrench, title: h.step2Title, desc: h.step2Desc, color: 'bg-blue-50 text-blue-600' },
    { icon: ClipboardCheck, title: h.step3Title, desc: h.step3Desc, color: 'bg-purple-50 text-purple-600' },
    { icon: TrendingUp, title: h.step4Title, desc: h.step4Desc, color: 'bg-amber-50 text-amber-600' },
  ];

  const trustFeatures = [
    { title: h.trustFeat1, desc: h.trustFeat1Desc, icon: GraduationCap, color: 'bg-blue-50 text-blue-600' },
    { title: h.trustFeat2, desc: h.trustFeat2Desc, icon: MessageSquare, color: 'bg-purple-50 text-purple-600' },
    { title: h.trustFeat3, desc: h.trustFeat3Desc, icon: Truck, color: 'bg-orange-50 text-orange-600' },
    { title: h.trustFeat4, desc: h.trustFeat4Desc, icon: Cpu, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="flex flex-col bg-white">

      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 overflow-hidden bg-slate-50">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">{h.heroTag}</span>
              </div>

              <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                {h.heroTitle}
              </h1>

              <p className="text-lg text-slate-500 max-w-lg leading-relaxed font-medium">
                {h.heroSubtitle}
              </p>
              <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                {h.heroSubtitleLine2}
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link
                  href={`/${locale}/courses`}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  {h.heroCTA1}
                </Link>
                <Link
                  href={`/${locale}/shop`}
                  className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <span>{h.heroCTA2}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="pt-8 flex items-center gap-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <span>{h.heroBadge1}</span>
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                <span>{h.heroBadge2}</span>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100 aspect-[4/3]">
                <img
                  src="/images/hero-small-animal-clinic.jpg"
                  alt="Small Animal Veterinary Training and Clinical Practice"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-[2s]"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. UPGRADE PATH VISUALIZATION */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">{h.upgradePathTag}</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{h.upgradePathTitle}</h3>
            <p className="mt-4 text-slate-500 text-lg">{h.upgradePathSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {upgradeSteps.map((step, idx) => (
              <div key={idx} className="relative flex flex-col items-center text-center group">
                {/* Connector arrow (hidden on first item and mobile) */}
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

                <h4 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed max-w-[220px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FEATURED TRAINING WITH EQUIPMENT COUNT */}
      <section className="py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">{h.featuredTag}</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{h.featuredTitle}</h3>
            <p className="mt-4 text-slate-500 text-lg">{h.featuredSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredCourses.map((course) => (
              <Link
                key={course.id}
                href={`/${locale}/courses/${course.id}`}
                className="group rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-white"
              >
                <div className="h-48 overflow-hidden relative">
                  <img
                    src={course.imageUrl}
                    alt={getLocalizedTitle(course)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                      {course.specialty}
                    </span>
                    <span className="px-3 py-1 bg-white/90 text-slate-700 text-xs font-bold rounded-full backdrop-blur-sm">
                      {course.level}
                    </span>
                  </div>
                  {equipmentCounts[course.id] > 0 && (
                    <div className="absolute bottom-3 right-3 bg-blue-50/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-blue-700 border border-blue-100 flex items-center gap-1.5">
                      <Wrench className="w-3 h-3" />
                      {equipmentCounts[course.id]} {h.equipmentBadge}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-[#00A884] transition-colors line-clamp-2">
                    {getLocalizedTitle(course)}
                  </h3>
                  <div className="space-y-2 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{course.startDate ? new Date(course.startDate).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{getLocalizedCity(course)}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end">
                    <span className="text-sm font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                      {h.learnMore} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {featuredCourses.length > 0 && (
            <div className="mt-12 text-center">
              <Link
                href={`/${locale}/courses`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
              >
                {h.viewAllTraining}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 4. CLINICAL TOOLKIT CATEGORIES */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">{h.toolkitTag}</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{h.toolkitTitle}</h3>
            <p className="mt-4 text-slate-500 text-lg">{h.toolkitSubtitle}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {clinicalCategories.map((cat) => (
              <Link
                key={cat.key}
                href={`/${locale}/shop?clinicalCategory=${cat.slug || cat.key}`}
                className="group flex flex-col items-center text-center p-8 rounded-2xl border border-slate-200 hover:border-[#00A884]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-50 group-hover:bg-[#00A884]/10 flex items-center justify-center mb-5 transition-colors duration-300 text-3xl">
                  {categoryIcons[cat.key] || cat.icon || '\uD83D\uDCE6'}
                </div>
                <h4 className="font-bold text-slate-900 mb-1 group-hover:text-[#00A884] transition-colors text-sm">
                  {(cat.labels as any)?.[language] || (cat.labels as any)?.en || cat.key}
                </h4>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href={`/${locale}/shop`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 transition-all"
            >
              {h.browseAll}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. TRUST / CREDIBILITY */}
      <section className="py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">{h.trustTag}</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{h.trustTitle}</h3>
            <p className="mt-4 text-slate-500 text-lg">{h.trustSubtitle}</p>
          </div>

          {/* Stats bar */}
          <div className="border border-slate-100 rounded-2xl bg-slate-50 p-8 mb-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: h.statCoursesVal, label: h.statCoursesLabel, sub: h.statCoursesSub },
                { value: h.statVetsVal, label: h.statVetsLabel, sub: h.statVetsSub },
                { value: h.statCountriesVal, label: h.statCountriesLabel, sub: h.statCountriesSub },
                { value: h.statCertsVal, label: h.statCertsLabel, sub: h.statCertsSub },
              ].map((stat, idx) => (
                <div key={idx} className="border-l border-slate-200 pl-8 first:border-0 first:pl-0">
                  <h3 className="text-3xl font-extrabold text-slate-900 mb-1">{stat.value}</h3>
                  <p className="text-base font-bold text-slate-900">{stat.label}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {trustFeatures.map((feat, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg transition-shadow duration-300">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${feat.color}`}>
                  <feat.icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg mb-3">{feat.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-transparent"></div>

            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                {h.ctaTitle}
              </h2>
              <p className="text-slate-400 text-lg">
                {h.ctaSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
                <Link
                  href={`/${locale}/courses`}
                  className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-bold text-base hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/20"
                >
                  {h.ctaCTA1}
                </Link>
                <Link
                  href={`/${locale}/shop`}
                  className="px-10 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold text-base hover:bg-white/20 transition-all"
                >
                  {h.ctaCTA2}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
