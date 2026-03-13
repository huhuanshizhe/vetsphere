'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  Wrench,
  ArrowRight,
  X,
  Star,
} from 'lucide-react';

// ============================================
// Constants
// ============================================

const SPECIALTIES = [
  'All',
  'Orthopedics',
  'Neurosurgery',
  'Soft Tissue',
  'Eye Surgery',
  'Ultrasound',
  'Exotics',
];

const LEVELS = ['All', 'Introductory', 'Intermediate', 'Advanced', 'Expert'];

const FORMATS = ['All', 'workshop', 'online', 'hybrid'];

const PAGE_SIZE = 12;

// ============================================
// Component
// ============================================

export default function IntlCoursesPageClient() {
  const { locale } = useLanguage();
  const searchParams = useSearchParams();

  // Data
  const [courses, setCourses] = useState<IntlCourse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [equipmentCounts, setEquipmentCounts] = useState<Record<string, number>>({});

  // Filters
  const initialSpecialty = searchParams.get('specialty') || 'All';
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [level, setLevel] = useState('All');
  const [format, setFormat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

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
    searchQuery.length > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSpecialty('All');
    setLevel('All');
    setFormat('All');
    setSearchQuery('');
    setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ============================================
  // Render
  // ============================================
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 py-12 pt-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 uppercase tracking-widest">
            <GraduationCap className="w-4 h-4" />
            Training Programs
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Veterinary Training
          </h1>
          <p className="text-slate-500 font-medium">
            Expert-led clinical training programs designed for veterinary professionals. Build skills, earn certifications, and discover recommended equipment.
          </p>
        </div>

        {/* Search & Filter Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
              showFilters || activeFilterCount > 0
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Specialty */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Specialty
              </label>
              <select
                value={specialty}
                onChange={(e) => { setSpecialty(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {SPECIALTIES.map(s => (
                  <option key={s} value={s}>{s === 'All' ? 'All Specialties' : s}</option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Skill Level
              </label>
              <select
                value={level}
                onChange={(e) => { setLevel(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {LEVELS.map(l => (
                  <option key={l} value={l}>{l === 'All' ? 'All Levels' : l}</option>
                ))}
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => { setFormat(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {FORMATS.map(f => (
                  <option key={f} value={f}>{f === 'All' ? 'All Formats' : f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-emerald-600 transition"
              >
                <X className="w-3.5 h-3.5" /> Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Specialty Tabs (when filters hidden) */}
      {!showFilters && (
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl mb-8">
          {SPECIALTIES.map(s => (
            <button
              key={s}
              onClick={() => { setSpecialty(s); setPage(0); }}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                specialty === s
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s === 'All' ? 'All Specialties' : s}
            </button>
          ))}
        </div>
      )}

      {/* Results Count */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {filteredCourses.length} of {total} training program{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden bg-white animate-pulse">
              <div className="h-52 bg-slate-100" />
              <div className="p-6 space-y-3">
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="py-24 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">No training programs found</h3>
          <p className="text-slate-400 mb-6">Try adjusting your filters or search terms.</p>
          <button
            onClick={clearFilters}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.map(course => {
            const eqCount = equipmentCounts[course.course_id] || 0;
            return (
              <Link
                key={course.id}
                href={`/${locale}/courses/${course.slug}`}
                className="group rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-white flex flex-col"
              >
                {/* Image */}
                <div className="h-52 overflow-hidden relative bg-slate-100">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <GraduationCap className="w-16 h-16 text-slate-200" />
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {course.is_featured && (
                      <span className="px-2.5 py-1 bg-amber-400 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> Featured
                      </span>
                    )}
                    {course.specialty && (
                      <span className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                        {course.specialty}
                      </span>
                    )}
                    {course.level && (
                      <span className="px-2.5 py-1 bg-white/90 text-slate-700 text-xs font-bold rounded-full backdrop-blur-sm">
                        {course.level}
                      </span>
                    )}
                  </div>
                  {/* Equipment badge */}
                  {eqCount > 0 && (
                    <div className="absolute bottom-3 right-3 bg-blue-50/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-blue-700 border border-blue-100 flex items-center gap-1.5">
                      <Wrench className="w-3 h-3" />
                      {eqCount} Equipment Kit{eqCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  {course.summary && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{course.summary}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-4">
                    {course.format && (
                      <span className="px-2 py-0.5 bg-slate-50 rounded-md font-medium capitalize">{course.format}</span>
                    )}
                    {course.duration_minutes && (
                      <span className="px-2 py-0.5 bg-slate-50 rounded-md font-medium">
                        {course.duration_minutes >= 60
                          ? `${Math.round(course.duration_minutes / 60)}h`
                          : `${course.duration_minutes}min`}
                      </span>
                    )}
                    {course.target_audience && (
                      <span className="line-clamp-1">{course.target_audience}</span>
                    )}
                  </div>

                  {/* Rating & enrollment */}
                  <div className="flex items-center gap-3 mb-4">
                    {course.avg_rating && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {course.avg_rating.toFixed(1)}
                      </span>
                    )}
                    {course.enrollment_count > 0 && (
                      <span className="text-xs text-slate-400">{course.enrollment_count} enrolled</span>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    {course.is_free ? (
                      <span className="text-sm font-bold text-emerald-600">Free</span>
                    ) : course.price ? (
                      <span className="text-lg font-bold text-slate-900">
                        {course.currency === 'USD' ? '$' :
                         course.currency === 'CNY' ? '¥' :
                         course.currency === 'JPY' ? '¥' :
                         course.currency === 'THB' ? '฿' : '$'}
                        {course.price.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">Contact for pricing</span>
                    )}
                    <span className="text-sm font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                      View Course <ArrowRight className="w-3.5 h-3.5" />
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
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-10 h-10 rounded-lg text-sm font-bold transition ${
                page === i
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-16 bg-slate-900 rounded-3xl p-10 md:p-14 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
          Need Help Choosing the Right Training?
        </h2>
        <p className="text-slate-400 mb-8 max-w-lg mx-auto">
          Our team can recommend training programs based on your specialty, experience level, and clinic goals.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href={`/${locale}/for-clinics#consultation`}
            className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/20"
          >
            Request a Recommendation
          </Link>
          <Link
            href={`/${locale}/shop`}
            className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-all"
          >
            Browse Equipment
          </Link>
        </div>
      </div>
    </div>
  );
}
