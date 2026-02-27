'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { Specialty, Course } from '@/types';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

const CourseCard: React.FC<{ course: Course; onSelect: (c: Course) => void; isAuthenticated: boolean }> = ({ course, onSelect, isAuthenticated }) => {
  const { t, language } = useLanguage();
  const router = useRouter();

  // Helper for localized content
  const getLocalizedContent = () => {
      let title = course.title;
      let desc = course.description; // fallback

      if (language === 'zh') {
          title = course.title_zh || course.title;
          desc = course.description_zh || course.description;
      } else if (language === 'th') {
          title = course.title_th || course.title;
          desc = course.description_th || course.description;
      }
      return { title, desc };
  };

  const { title } = getLocalizedContent();

  return (
    <div className="clinical-card flex flex-col h-full group overflow-hidden">
      <div className="h-52 relative overflow-hidden bg-slate-100">
        <img 
          src={course.imageUrl} 
          alt={title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 flex gap-2">
            <span className="bg-white px-2.5 py-1.5 rounded text-xs font-black text-vs border border-slate-100 uppercase tracking-widest shadow-sm">
              {course.level}
            </span>
        </div>
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 shadow-sm border border-white/50">
          📍 {course.location.city}
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-vs"></span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{course.specialty}</span>
        </div>
        
        <h3 className="text-xl font-extrabold text-slate-900 mb-4 leading-snug group-hover:text-vs transition-colors line-clamp-2">
          {title}
        </h3>
        
        <div className="flex items-center gap-4 mb-6">
          <img src={course.instructor.imageUrl} className="w-10 h-10 rounded-full border border-slate-100 shadow-sm" />
          <div>
            <p className="text-sm font-black text-slate-800 leading-tight">{course.instructor.name}</p>
            <p className="text-xs text-slate-400 font-medium truncate w-40">{course.instructor.title}</p>
          </div>
        </div>
        
        <div className="mt-auto pt-5 border-t border-slate-50 flex items-center justify-between">
          <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">{t.courses.tuition}</p>
              {isAuthenticated ? (
                <p className="text-xl font-black text-slate-900">¥{course.price.toLocaleString()}</p>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); router.push('/auth'); }}
                  className="flex items-center gap-1.5 text-sm font-black text-vs uppercase hover:underline"
                >
                  <span className="text-[14px]">🔒</span> {t.auth.loginToView}
                </button>
              )}
          </div>
          <button 
            onClick={() => onSelect(course)}
            className="w-12 h-12 rounded-xl bg-slate-50 text-vs flex items-center justify-center hover:bg-vs hover:text-white transition-all shadow-sm"
          >
            <span className="text-2xl">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const CoursesPageClient: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { addNotification } = useNotification();
  const initialFilter = searchParams.get('specialty') || 'All';
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Specialty | 'All'>(initialFilter as Specialty | 'All');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const { addToCart } = useCart();

  // Advanced filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100000 });
  const [sortBy, setSortBy] = useState<'date' | 'price-asc' | 'price-desc' | 'name'>('date');

  const levels = ['All', 'Introductory', 'Intermediate', 'Advanced'];

  useEffect(() => {
    api.getCourses().then(data => {
        setCourses(data);
        setLoading(false);
    });
  }, []);

  const handleRegister = (course: Course) => {
    if (!isAuthenticated) {
        router.push('/auth');
        return;
    }
    const currentTitle = language === 'zh' ? (course.title_zh || course.title) : language === 'th' ? (course.title_th || course.title) : course.title;
    
    addToCart({
      id: course.id,
      name: currentTitle,
      price: course.price,
      currency: course.currency,
      imageUrl: course.imageUrl,
      type: 'course',
      quantity: 1
    });
    setSelectedCourse(null);
    router.push('/checkout');
  };

  const handleShareCourse = async (course: Course) => {
    const currentTitle = language === 'zh' ? (course.title_zh || course.title) : language === 'th' ? (course.title_th || course.title) : course.title;
    const shareUrl = `${window.location.origin}/courses?id=${course.id}`;
    const shareTitle = `[VetSphere Training] ${currentTitle}`;
    
    if (navigator.share) {
        try {
            await navigator.share({ title: shareTitle, url: shareUrl });
            if (user) {
                await api.awardPoints(user.id, 50, `Shared course: ${currentTitle}`);
                addNotification({ id: `sh-c-${Date.now()}`, type: 'system', title: t.common.pointsEarned, message: '+50 pts for sharing course.', read: true, timestamp: new Date() });
            }
        } catch (e) { console.log('Share canceled'); }
    } else {
        navigator.clipboard.writeText(shareUrl);
        addNotification({ id: `sh-c-${Date.now()}`, type: 'system', title: t.common.copySuccess, message: 'Points awarded!', read: true, timestamp: new Date() });
        if (user) await api.awardPoints(user.id, 50, `Copied course link: ${currentTitle}`);
    }
  };

  // Only show published courses on public page
  const visibleCourses = courses.filter(c => c.status === 'Published');

  // Apply all filters
  const filteredCourses = visibleCourses
    .filter(c => {
      // Specialty filter
      if (filter !== 'All' && c.specialty !== filter) return false;
      // Level filter
      if (levelFilter !== 'All' && c.level !== levelFilter) return false;
      // Price filter
      if (c.price < priceRange.min || c.price > priceRange.max) return false;
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const title = (language === 'zh' ? c.title_zh : language === 'th' ? c.title_th : c.title) || c.title;
        const desc = (language === 'zh' ? c.description_zh : language === 'th' ? c.description_th : c.description) || c.description;
        if (!title.toLowerCase().includes(query) && 
            !desc?.toLowerCase().includes(query) &&
            !c.instructor.name.toLowerCase().includes(query) &&
            !c.location.city.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'name': return a.title.localeCompare(b.title);
        case 'date':
        default:
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
    });

  const activeFilterCount = [
    filter !== 'All',
    levelFilter !== 'All',
    priceRange.min > 0 || priceRange.max < 100000,
    searchQuery.length > 0
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pt-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-8">
        <div className="max-w-xl space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t.courses.title}</h1>
          <p className="text-slate-500 font-medium">{t.courses.subtitle}</p>
        </div>
        
        {/* Search & Filter Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder={language === 'zh' ? '搜索课程...' : 'Search courses...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs text-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
              showFilters || activeFilterCount > 0
                ? 'bg-vs text-white border-vs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {language === 'zh' ? '筛选' : 'Filter'}
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="grid md:grid-cols-4 gap-6">
            {/* Specialty */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {language === 'zh' ? '专业方向' : 'Specialty'}
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-vs/20 focus:border-vs"
              >
                <option value="All">{language === 'zh' ? '全部专业' : 'All Specialties'}</option>
                {Object.values(Specialty).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {language === 'zh' ? '难度等级' : 'Level'}
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-vs/20 focus:border-vs"
              >
                {levels.map(l => (
                  <option key={l} value={l}>{l === 'All' ? (language === 'zh' ? '全部等级' : 'All Levels') : l}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {language === 'zh' ? '价格范围' : 'Price Range'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min || ''}
                  onChange={(e) => setPriceRange(p => ({ ...p, min: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-vs/20 focus:border-vs"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max === 100000 ? '' : priceRange.max}
                  onChange={(e) => setPriceRange(p => ({ ...p, max: Number(e.target.value) || 100000 }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-vs/20 focus:border-vs"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {language === 'zh' ? '排序方式' : 'Sort By'}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-vs/20 focus:border-vs"
              >
                <option value="date">{language === 'zh' ? '开课日期' : 'Start Date'}</option>
                <option value="price-asc">{language === 'zh' ? '价格从低到高' : 'Price: Low to High'}</option>
                <option value="price-desc">{language === 'zh' ? '价格从高到低' : 'Price: High to Low'}</option>
                <option value="name">{language === 'zh' ? '课程名称' : 'Course Name'}</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setFilter('All');
                  setLevelFilter('All');
                  setPriceRange({ min: 0, max: 100000 });
                  setSearchQuery('');
                  setSortBy('date');
                }}
                className="text-sm font-bold text-slate-500 hover:text-vs transition"
              >
                {language === 'zh' ? '清除所有筛选' : 'Clear All Filters'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Specialty Tabs (when filters hidden) */}
      {!showFilters && (
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl mb-8">
          {['All', ...Object.values(Specialty)].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                filter === s 
                ? 'bg-white text-vs shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s === 'All' ? t.courses.allSpecialties : s}
            </button>
          ))}
        </div>
      )}

      {/* Results Count */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {language === 'zh' 
            ? `显示 ${filteredCourses.length} 门课程` 
            : `Showing ${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loading ? (
           <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-vs border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} onSelect={setSelectedCourse} isAuthenticated={isAuthenticated} />
            ))}
            {filteredCourses.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">{t.courses.empty}</p>
            </div>
            )}
        </div>
      )}

      {selectedCourse && (
        <div 
          className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedCourse(null)}
        >
          <div 
            className="bg-white rounded-[32px] w-full max-w-6xl my-auto overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Hero Section */}
            <div className="relative h-72 md:h-80 bg-slate-100 group">
              <img src={selectedCourse.imageUrl} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
              
              <div className="absolute top-0 right-0 p-6 flex gap-3 z-20">
                  <button 
                    onClick={() => handleShareCourse(selectedCourse)}
                    className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:bg-vs hover:text-white transition-all text-xl"
                  >📤</button>
                  <button 
                    onClick={() => setSelectedCourse(null)}
                    className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 text-slate-900 transition-all text-xl"
                  >✕</button>
              </div>

              <div className="absolute inset-0 flex items-center p-8 md:p-12">
                <div className="max-w-2xl relative z-10">
                    <span className="inline-block px-4 py-1.5 bg-emerald-50 text-vs text-xs font-black uppercase tracking-widest rounded-lg mb-4 shadow-sm border border-emerald-100">
                        {selectedCourse.specialty}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 leading-tight tracking-tight">
                        {language === 'zh' ? (selectedCourse.title_zh || selectedCourse.title) : language === 'th' ? (selectedCourse.title_th || selectedCourse.title) : selectedCourse.title}
                    </h2>
                    
                    <div className="flex flex-wrap gap-6 text-slate-500 text-xs font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-lg border border-slate-200/50">
                            📅 {selectedCourse.startDate} — {selectedCourse.endDate}
                        </span>
                        <span className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-lg border border-slate-200/50">
                            📍 {selectedCourse.location.city}
                        </span>
                        {language === 'zh' && <span className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-lg border border-slate-200/50">🌐 English with Chinese Translation</span>}
                    </div>
                </div>
              </div>
            </div>
            
            {/* Content Body */}
            <div className="flex-1 overflow-y-auto bg-[#FAFAFA] relative">
                <div className="grid lg:grid-cols-12 min-h-[500px]">
                    
                    {/* Left: Main Content (Agenda & Instructor) */}
                    <div className="lg:col-span-8 p-8 md:p-12 space-y-12">
                        {/* Instructor Card */}
                        <div className="flex flex-col md:flex-row gap-8 items-start bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                            <img src={selectedCourse.instructor.imageUrl} className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-md" />
                            <div className="flex-1">
                                <h5 className="text-xl font-black text-slate-900 mb-1">{selectedCourse.instructor.name}</h5>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">{selectedCourse.instructor.title}</p>
                                <p className="text-base text-slate-600 leading-relaxed italic border-l-4 border-vs pl-4">
                                    "{selectedCourse.instructor.bio}"
                                </p>
                            </div>
                        </div>

                        {/* Agenda Timeline */}
                        <div className="space-y-8">
                            <h4 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                🕒 {language === 'zh' ? '课程大纲 Agenda' : 'Course Agenda'}
                            </h4>
                            
                            <div className="space-y-4">
                                {selectedCourse.agenda.map((day, dIdx) => (
                                    <div key={dIdx} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                                            <span className="bg-vs/10 text-vs px-3 py-1.5 rounded text-xs font-black uppercase tracking-widest">{day.day}</span>
                                            <span className="text-sm font-bold text-slate-500">{day.date}</span>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {day.items.map((item, iIdx) => (
                                                <div key={iIdx} className="p-6 flex gap-6 hover:bg-slate-50 transition-colors group">
                                                    <div className="w-3 h-3 mt-1.5 rounded-full bg-slate-200 group-hover:bg-vs transition-colors shrink-0"></div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-4 mb-1">
                                                            <span className="font-mono text-sm font-bold text-slate-400">{item.time}</span>
                                                        </div>
                                                        <p className="text-base font-bold text-slate-800 leading-relaxed">{item.activity}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Sticky Sidebar */}
                    <div className="lg:col-span-4 bg-white border-l border-slate-100 p-8 md:p-12 space-y-8">
                        <div className="p-8 rounded-[24px] bg-slate-50 border border-slate-100">
                            <h3 className="font-black text-xl mb-6">{language === 'zh' ? '课程费用' : 'Course Tuition'}</h3>
                            
                            <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-200/50">
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{language === 'zh' ? '主会场' : 'General Admission'}</p>
                                    <p className="text-xs text-slate-400">{language === 'zh' ? '含拼房住宿' : 'Includes Accommodation'}</p>
                                </div>
                                <span className="text-3xl font-black text-vs">¥{selectedCourse.price.toLocaleString()}</span>
                            </div>

                            <div className="space-y-3 mb-8">
                                <div className="flex justify-between text-sm font-bold text-slate-500">
                                    <span>{language === 'zh' ? '名额' : 'Capacity'}</span>
                                    <span>0 / 10</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-slate-500">
                                    <span>{language === 'zh' ? '报名截止' : 'Deadline'}</span>
                                    <span>2026/03/15</span>
                                </div>
                            </div>

                            <button onClick={() => handleRegister(selectedCourse)} className="w-full bg-vs text-white py-4 rounded-2xl font-black text-base shadow-lg hover:bg-vs-dark transition-all flex items-center justify-center gap-2">
                                🛒 {isAuthenticated ? (language === 'zh' ? '立即报名' : 'Enroll Now') : t.auth.loginToRegister}
                            </button>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'zh' ? '难度等级' : 'Level'}</span>
                                    <span className="bg-slate-100 px-3 py-1 rounded text-xs font-black">{selectedCourse.level}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'zh' ? '专业方向' : 'Specialty'}</span>
                                    <span className="text-xs font-bold text-slate-900">{selectedCourse.specialty}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'zh' ? '适合人群' : 'Target'}</span>
                                    <span className="text-xs font-bold text-slate-900">{language === 'zh' ? '小动物临床兽医' : 'Small Animal Vets'}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'zh' ? '总时长' : 'Duration'}</span>
                                    <span className="text-xs font-bold text-slate-900">96 {language === 'zh' ? '小时' : 'Hours'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPageClient;
