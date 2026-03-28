'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import {
  getIntlCourses,
  getIntlCourseProducts,
  IntlCourse,
} from '../../services/intl-api';
import {
  Search,
  SlidersHorizontal,
  GraduationCap,
  Award,
  Clock,
  Users,
  Star,
  TrendingUp,
  ChevronRight,
  X,
  Filter,
  BookOpen,
  Wrench,
  Flame,
  CheckCircle2,
} from 'lucide-react';

const PAGE_SIZE = 12;

// ============================================
// Component
// ============================================

export default function IntlCoursesPageClient() {
  const { locale, t } = useLanguage();
  const c = t.courses;
  const searchParams = useSearchParams();

  // Data
  const [courses, setCourses] = useState<IntlCourse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [equipmentCounts, setEquipmentCounts] = useState<Record<string, number>>({});

  // Get specialty list from translations
  const SPECIALTIES = [
    { key: 'all', label: c.all },
    { key: 'Orthopedics', label: c.orthopedics },
    { key: 'Neurosurgery', label: c.neurosurgery },
    { key: 'Soft Tissue', label: c.softTissue },
    { key: 'Ophthalmology', label: c.ophthalmology },
    { key: 'Ultrasound', label: c.ultrasound },
    { key: 'Emergency', label: c.emergency },
    { key: 'Exotics', label: c.exotics },
  ];

  const LEVELS = [
    { value: 'All', label: c.allLevels, color: 'from-slate-100 to-slate-200' },
    { value: 'Introductory', label: c.introductory, color: 'from-green-100 to-green-200' },
    { value: 'Intermediate', label: c.intermediate, color: 'from-blue-100 to-blue-200' },
    { value: 'Advanced', label: c.advanced, color: 'from-purple-100 to-purple-200' },
    { value: 'Expert', label: c.expert, color: 'from-amber-100 to-amber-200' },
  ];

  const FORMATS = [
    { value: 'All', label: c.allFormats },
    { value: 'workshop', label: c.workshop },
    { value: 'online', label: c.online },
    { value: 'hybrid', label: c.hybrid },
  ];

  const CERTIFICATIONS = [
    { value: 'All', label: c.anyCertification },
    { value: 'acvs', label: c.acvsCredits },
    { value: 'ecvs', label: c.ecvsCredits },
    { value: 'decvs', label: c.decvsCredits },
  ];

  // Filters
  const initialSpecialty = searchParams.get('specialty') || 'All';
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [level, setLevel] = useState('All');
  const [format, setFormat] = useState('All');
  const [certification, setCertification] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load courses
  useEffect(() => {
    setLoading(true);
    getIntlCourses({
      specialty: specialty !== 'All' ? specialty : undefined,
      level: level !== 'All' ? level : undefined,
      format: format !== 'All' ? format : undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      locale: locale,
    }).then(result => {
      setCourses(result.items);
      setTotal(result.total);
      setLoading(false);
    });
  }, [specialty, level, format, page, locale]);

  // Load equipment counts for visible courses
  useEffect(() => {
    if (courses.length === 0) return;
    const courseIds = courses.map(c => c.course_id);
    Promise.all(
      courseIds.map(id =>
        getIntlCourseProducts(id)
          .then(products => ({ id, count: products.length }))
          .catch(() => ({ id, count: 0 }))
      )
    ).then(results => {
      const counts: Record<string, number> = {};
      results.forEach(r => { counts[r.id] = r.count; });
      setEquipmentCounts(counts);
    });
  }, [courses]);

  // Client-side search filter
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.summary?.toLowerCase().includes(q) ||
      c.specialty?.toLowerCase().includes(q) ||
      c.base_title?.toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  const activeFilterCount = [
    specialty !== 'All',
    level !== 'All',
    format !== 'All',
    certification !== 'All',
    searchQuery.length > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSpecialty('All');
    setLevel('All');
    setFormat('All');
    setCertification('All');
    setSearchQuery('');
    setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Level color helpers
  function getLevelColor(level: string): string {
    const levelMap: Record<string, string> = {
      'Introductory': 'from-emerald-500 to-emerald-600',
      'Intermediate': 'from-blue-500 to-blue-600',
      'Advanced': 'from-purple-500 to-purple-600',
      'Expert': 'from-amber-500 to-amber-600',
    };
    return levelMap[level] || 'from-slate-500 to-slate-600';
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-32 pb-20">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500 rounded-full blur-[128px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-[128px]" />
        </div>
        <div className="absolute inset-0 opacity-10 vs-grid-pattern" />

        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-slide-up">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
                <Flame className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300 uppercase tracking-widest">{c.heroTag}</span>
              </div>

              <h1 className="text-5xl lg:text-[4rem] font-extrabold text-white leading-[1.08] tracking-tight">
                {c.heroTitle}
                <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent block mt-2">
                  {c.heroTitleHighlight}
                </span>
              </h1>

              <p className="text-xl text-slate-300 max-w-xl leading-relaxed font-medium">
                {c.heroSubtitle}
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                  <Award className="w-5 h-5 text-emerald-400" />
                  <span className="text-white font-medium">{c.heroBadge1}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">{c.heroBadge2}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  <span className="text-white font-medium">{c.heroBadge3}</span>
                </div>
              </div>
            </div>

            <div className="relative hidden lg:block animate-fade-in">
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-900/50 border border-slate-700/30 aspect-[4/3]">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
                <img
                  src="/images/hero-vet-training.png"
                  alt={c.heroTitleHighlight}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <p className="text-white text-sm font-medium">{c.heroImageCaption}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 py-12">
        {/* Search & Filters Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8 sticky top-24 z-40">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={c.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-base bg-slate-50 transition-all"
              />
            </div>

            {/* Filter Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2.5 px-5 py-3.5 rounded-xl border text-sm font-bold transition-all ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                {c.filters}
                {activeFilterCount > 0 && (
                  <span className="ml-1 w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* View Mode Toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <div className="grid grid-cols-2 gap-0.5">
                    <div className="w-2 h-2 bg-current rounded-sm" />
                    <div className="w-2 h-2 bg-current rounded-sm" />
                    <div className="w-2 h-2 bg-current rounded-sm" />
                    <div className="w-2 h-2 bg-current rounded-sm" />
                  </div>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="w-5 h-1 bg-current rounded-sm" />
                    <div className="w-4 h-1 bg-current rounded-sm" />
                    <div className="w-5 h-1 bg-current rounded-sm" />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Specialty */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    {c.specialty}
                  </label>
                  <select
                    value={specialty}
                    onChange={(e) => { setSpecialty(e.target.value); setPage(0); }}
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    {SPECIALTIES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Level */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    {c.skillLevel}
                  </label>
                  <select
                    value={level}
                    onChange={(e) => { setLevel(e.target.value); setPage(0); }}
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    {LEVELS.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>

                {/* Format */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    {c.format}
                  </label>
                  <select
                    value={format}
                    onChange={(e) => { setFormat(e.target.value); setPage(0); }}
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    {FORMATS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Certification */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    {c.certification}
                  </label>
                  <select
                    value={certification}
                    onChange={(e) => { setCertification(e.target.value); setPage(0); }}
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    {CERTIFICATIONS.map(cert => (
                      <option key={cert.value} value={cert.value}>{cert.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors"
                  >
                    <X className="w-4 h-4" /> {c.clearFilters}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              {c.resultsCount.replace('{count}', String(filteredCourses.length))}
            </h2>
            <p className="text-slate-500 text-sm">
              {c.totalAvailable.replace('{total}', String(total))}
            </p>
          </div>
          {!showFilters && (
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.slice(0, 7).map(s => (
                <button
                  key={s.key}
                  onClick={() => { setSpecialty(s.key); setPage(0); }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    specialty === s.key
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Course Grid/List */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden bg-white animate-pulse">
                <div className="h-56 bg-slate-100" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-24 text-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl border border-dashed border-slate-300">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-600 mb-2">{c.noResults}</h3>
            <p className="text-slate-400 mb-6">{c.noResultsHint}</p>
            <button
              onClick={clearFilters}
              className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20"
            >
              {c.clearFilters}
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredCourses.map((course, idx) => {
              const eqCount = equipmentCounts[course.course_id] || 0;
              const levelColor = getLevelColor(course.level || '');

              return (
                <Link
                  key={course.id}
                  href={`/${locale}/courses/${course.slug}`}
                  className={`group ${
                    viewMode === 'grid'
                      ? 'gradient-card rounded-2xl overflow-hidden flex flex-col'
                      : 'gradient-card rounded-2xl overflow-hidden flex flex-col md:flex-row'
                  } animate-scale-in`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* Image */}
                  <div className={viewMode === 'grid' ? 'h-56 overflow-hidden relative bg-slate-100' : 'w-full md:w-96 shrink-0'}>
                    <div className={`${viewMode === 'grid' ? 'h-full' : 'h-full aspect-square'} relative bg-slate-100`}>
                      {course.cover_image_url ? (
                        <img
                          src={course.cover_image_url}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <GraduationCap className="w-20 h-20 text-slate-200" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                      {/* Badges */}
                      <div className="absolute top-4 left-4 flex gap-2 z-10">
                        {course.is_featured && (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5" /> {c.featured}
                          </span>
                        )}
                        {course.specialty && (
                          <span className="px-3 py-1.5 bg-white/95 backdrop-blur-sm text-slate-700 text-xs font-bold rounded-full shadow-lg">
                            {course.specialty}
                          </span>
                        )}
                      </div>

                      {/* Level Badge */}
                      {course.level && (
                        <div className={`absolute bottom-4 left-4 px-4 py-2 bg-gradient-to-r ${levelColor} text-white text-xs font-bold rounded-xl shadow-lg border-2 border-white`}>
                          {course.level}
                        </div>
                      )}

                      {/* Equipment Kit Badge */}
                      {eqCount > 0 && (
                        <div className="absolute bottom-4 right-4 bg-blue-500/95 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-bold text-white border-2 border-blue-400 flex items-center gap-1.5 shadow-lg">
                          <Wrench className="w-3.5 h-3.5" />
                          {eqCount} {eqCount !== 1 ? c.equipmentKits : c.equipmentKit}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    {/* Rating & Enrollment */}
                    <div className="flex items-center gap-3 mb-3">
                      {course.avg_rating && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-lg text-amber-700 font-bold text-sm">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          {course.avg_rating.toFixed(1)}
                        </span>
                      )}
                      {course.enrollment_count > 0 && (
                        <span className="text-xs text-slate-400 font-medium">
                          <Users className="w-3.5 h-3.5 inline mr-1" />
                          {course.enrollment_count} {c.enrolled}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    {course.summary && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4">{course.summary}</p>
                    )}

                    {/* Course Info */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                      {course.format && (
                        <span className="px-2.5 py-1.5 bg-slate-100 rounded-lg font-medium text-slate-600 capitalize">
                          {course.format}
                        </span>
                      )}
                      {course.duration_minutes && (
                        <span className="px-2.5 py-1.5 bg-slate-100 rounded-lg font-medium text-slate-600 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {course.duration_minutes >= 60
                            ? `${Math.round(course.duration_minutes / 60)}h`
                            : `${course.duration_minutes}min`}
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      {course.is_free ? (
                        <span className="text-lg font-bold text-emerald-600">{c.free}</span>
                      ) : course.price ? (
                        <div>
                          <span className="text-2xl font-bold text-slate-900">
                            {course.currency === 'USD' ? '$' :
                             course.currency === 'CNY' ? '¥' :
                             course.currency === 'JPY' ? '¥' :
                             course.currency === 'THB' ? '฿' : '$'}
                            {course.price.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 font-medium">{c.contactPricing}</span>
                      )}
                      <span className="text-sm font-bold text-emerald-600 group-hover:underline flex items-center gap-2 transition-all">
                        {c.viewCourse} <ChevronRight className="w-4 h-4 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {c.previous}
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              let pageNum = i;
              if (totalPages > 5) {
                if (page < 3) {
                  pageNum = i;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = page - 2 + i;
                }
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-11 h-11 rounded-xl text-sm font-bold transition-all ${
                    page === pageNum
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {c.next}
            </button>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-[2.5rem] p-12 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {c.bottomTitle}
            </h2>
            <p className="text-xl text-emerald-100 leading-relaxed">
              {c.bottomSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link
                href={`/${locale}/for-clinics#consultation`}
                className="group px-10 py-4 bg-white text-emerald-700 rounded-2xl font-bold text-base hover:bg-emerald-50 transition-all shadow-xl flex items-center gap-3"
              >
                {c.getRecommendation}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href={`/${locale}/courses`}
                className="group px-10 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/20 rounded-2xl font-bold text-base hover:bg-white/20 transition-all flex items-center gap-3"
              >
                {c.browseAll}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}