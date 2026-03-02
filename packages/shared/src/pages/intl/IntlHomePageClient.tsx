'use client';
/* eslint-disable @next/next/no-img-element */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useSiteConfig } from '../../context/SiteConfigContext';
import { Specialty } from '../../types';
import {
  MapPin,
  Calendar,
  Zap,
  Wrench,
  Scissors,
  Package,
  Monitor,
  GraduationCap,
  MessageSquare,
  Truck,
  Cpu,
  ArrowRight,
} from 'lucide-react';

export default function IntlHomePageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { siteConfig } = useSiteConfig();

  const locale = language || siteConfig.defaultLocale;
  const h = t.intlHome;

  const featuredCourses = [
    {
      title: h.course1Title,
      specialty: h.course1Specialty,
      level: h.course1Level,
      location: h.course1Location,
      date: h.course1Date,
      price: h.course1Price,
      image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: h.course2Title,
      specialty: h.course2Specialty,
      level: h.course2Level,
      location: h.course2Location,
      date: h.course2Date,
      price: h.course2Price,
      image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: h.course3Title,
      specialty: h.course3Specialty,
      level: h.course3Level,
      location: h.course3Location,
      date: h.course3Date,
      price: h.course3Price,
      image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const productCategories = [
    { name: h.catPowerTools, desc: h.catPowerToolsDesc, icon: Zap, group: 'PowerTools' },
    { name: h.catImplants, desc: h.catImplantsDesc, icon: Wrench, group: 'Implants' },
    { name: h.catHandInstruments, desc: h.catHandInstrumentsDesc, icon: Scissors, group: 'HandInstruments' },
    { name: h.catConsumables, desc: h.catConsumablesDesc, icon: Package, group: 'Consumables' },
    { name: h.catEquipment, desc: h.catEquipmentDesc, icon: Monitor, group: 'Equipment' },
  ];

  const disciplines = [
    {
      title: h.orthoTitle,
      desc: h.orthoDesc,
      specialty: Specialty.ORTHOPEDICS,
      emoji: '\u{1F9B4}',
      image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80',
      grayscale: true,
    },
    {
      title: h.neuroTitle,
      desc: h.neuroDesc,
      specialty: Specialty.NEUROSURGERY,
      emoji: '\u{1F9E0}',
      image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80',
      grayscale: false,
    },
    {
      title: h.softTitle,
      desc: h.softDesc,
      specialty: Specialty.SOFT_TISSUE,
      emoji: '\u{1FA79}',
      image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=80',
      grayscale: false,
    },
  ];

  const features = [
    { title: h.featLabs, desc: h.featLabsDesc, icon: GraduationCap, color: 'bg-blue-50 text-blue-600' },
    { title: h.featCase, desc: h.featCaseDesc, icon: MessageSquare, color: 'bg-purple-50 text-purple-600' },
    { title: h.featSupply, desc: h.featSupplyDesc, icon: Truck, color: 'bg-orange-50 text-orange-600' },
    { title: h.featDigital, desc: h.featDigitalDesc, icon: Cpu, color: 'bg-emerald-50 text-emerald-600' },
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
                  src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1600&q=90"
                  alt="Veterinary Surgeon in Operating Room"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-[2s]"
                  loading="eager"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent p-8 pt-24">
                  <p className="text-white font-bold text-lg">{h.course1Title}</p>
                  <p className="text-slate-300 text-sm">{h.course1Location}</p>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-[200px] hidden md:block">
                <p className="text-4xl font-extrabold text-slate-900 mb-1">{h.heroOverlayCount}</p>
                <p className="text-sm text-slate-500 font-medium leading-tight">{h.heroOverlayLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS BAR */}
      <section className="border-b border-slate-100 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: h.statCoursesVal, label: h.statCoursesLabel, sub: h.statCoursesSub },
              { value: h.statVetsVal, label: h.statVetsLabel, sub: h.statVetsSub },
              { value: h.statCountriesVal, label: h.statCountriesLabel, sub: h.statCountriesSub },
              { value: h.statCertsVal, label: h.statCertsLabel, sub: h.statCertsSub },
            ].map((stat, idx) => (
              <div key={idx} className="border-l border-slate-100 pl-8 first:border-0 first:pl-0">
                <h3 className="text-3xl font-extrabold text-slate-900 mb-1">{stat.value}</h3>
                <p className="text-base font-bold text-slate-900">{stat.label}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FEATURED COURSES */}
      <section className="py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">{h.featuredTitle}</h2>
            <p className="text-slate-500 text-lg">{h.featuredSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredCourses.map((course, idx) => (
              <Link
                key={idx}
                href={`/${locale}/courses`}
                className="group rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-white"
              >
                <div className="h-48 overflow-hidden relative">
                  <img
                    src={course.image}
                    alt={course.title}
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
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-[#00A884] transition-colors">
                    {course.title}
                  </h3>
                  <div className="space-y-2 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{course.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{course.location}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xl font-extrabold text-slate-900">{course.price}</span>
                    <span className="text-sm font-bold text-emerald-600 group-hover:underline">
                      {h.learnMore} &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href={`/${locale}/courses`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
            >
              {h.viewAllCourses}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. CORE DISCIPLINES */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">{h.disciplinesTag}</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{h.disciplinesTitle}</h3>
            <p className="mt-4 text-slate-500 text-lg">{h.disciplinesDesc}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {disciplines.map((d, idx) => (
              <div
                key={idx}
                onClick={() => router.push(`/${locale}/courses?specialty=${d.specialty}`)}
                className="group cursor-pointer rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-white"
              >
                <div className="h-64 overflow-hidden relative">
                  <img
                    src={d.image}
                    alt={d.title}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${d.grayscale ? 'grayscale' : ''}`}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors"></div>
                </div>
                <div className="p-8">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm mb-6 border border-slate-100">
                    {d.emoji}
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">{d.title}</h4>
                  <p className="text-base text-slate-500 leading-relaxed mb-6">{d.desc}</p>
                  <span className="text-sm font-black text-emerald-600 uppercase tracking-widest group-hover:underline">
                    {h.explore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PRODUCT CATEGORIES */}
      <section className="py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">{h.productsTitle}</h2>
            <p className="text-slate-500 text-lg">{h.productsSubtitle}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {productCategories.map((cat, idx) => (
              <Link
                key={idx}
                href={`/${locale}/shop?group=${cat.group}`}
                className="group flex flex-col items-center text-center p-8 rounded-2xl border border-slate-200 hover:border-[#00A884]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-50 group-hover:bg-[#00A884]/10 flex items-center justify-center mb-5 transition-colors duration-300">
                  <cat.icon className="w-7 h-7 text-slate-400 group-hover:text-[#00A884] transition-colors duration-300" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1 group-hover:text-[#00A884] transition-colors">{cat.name}</h4>
                <p className="text-xs text-slate-500">{cat.desc}</p>
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

      {/* 6. WHY VETSPHERE */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">{h.whyTitle}</h2>
            <p className="mt-4 text-slate-500 text-lg">{h.whySubtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {features.map((feat, idx) => (
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

      {/* 7. CTA SECTION */}
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
                  href={`/${locale}/auth`}
                  className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-bold text-base hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/20"
                >
                  {h.ctaButton1}
                </Link>
                <Link
                  href={`/${locale}/contact`}
                  className="px-10 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold text-base hover:bg-white/20 transition-all"
                >
                  {h.ctaButton2}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
