'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import { Course } from '@/types';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

interface CourseDetailClientProps {
  courseId: string;
}

const CourseDetailClient: React.FC<CourseDetailClientProps> = ({ courseId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { addNotification } = useNotification();
  const { addToCart } = useCart();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current locale from pathname
  const locale = pathname.split('/')[1] || 'en';

  useEffect(() => {
    api.getCourses().then(courses => {
      const found = courses.find(c => c.id === courseId);
      setCourse(found || null);
      setLoading(false);
    });
  }, [courseId]);

  const getLocalizedContent = (course: Course) => {
    let title = course.title;
    let desc = course.description;

    if (language === 'zh') {
      title = course.title_zh || course.title;
      desc = course.description_zh || course.description;
    } else if (language === 'th') {
      title = course.title_th || course.title;
      desc = course.description_th || course.description;
    }
    return { title, desc };
  };

  const handleRegister = () => {
    if (!course) return;
    
    if (!isAuthenticated) {
      router.push(`/${locale}/auth`);
      return;
    }
    
    const { title } = getLocalizedContent(course);
    
    addToCart({
      id: course.id,
      name: title,
      price: course.price,
      currency: course.currency,
      imageUrl: course.imageUrl,
      type: 'course',
      quantity: 1
    });
    
    router.push(`/${locale}/checkout`);
  };

  const handleShare = async () => {
    if (!course) return;
    
    const { title } = getLocalizedContent(course);
    const shareUrl = `${window.location.origin}/${locale}/courses/${course.id}`;
    const shareTitle = `[VetSphere Training] ${title}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        if (user) {
          await api.awardPoints(user.id, 50, `Shared course: ${title}`);
          addNotification({ 
            id: `sh-c-${Date.now()}`, 
            type: 'system', 
            title: t.common.pointsEarned, 
            message: '+50 pts for sharing course.', 
            read: true, 
            timestamp: new Date() 
          });
        }
      } catch {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      addNotification({ 
        id: `sh-c-${Date.now()}`, 
        type: 'system', 
        title: t.common.copySuccess, 
        message: 'Link copied to clipboard!', 
        read: true, 
        timestamp: new Date() 
      });
      if (user) await api.awardPoints(user.id, 50, `Copied course link: ${title}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-vs border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen pt-32 flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-black text-slate-900">
          {language === 'zh' ? '课程未找到' : 'Course Not Found'}
        </h1>
        <p className="text-slate-500">
          {language === 'zh' ? '您访问的课程不存在或已下架' : 'The course you are looking for does not exist or has been removed.'}
        </p>
        <Link 
          href={`/${locale}/courses`}
          className="px-6 py-3 bg-vs text-white rounded-xl font-bold hover:bg-vs-dark transition-colors"
        >
          {language === 'zh' ? '返回课程列表' : 'Back to Courses'}
        </Link>
      </div>
    );
  }

  const { title, desc } = getLocalizedContent(course);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative h-[50vh] min-h-[400px] bg-slate-900">
        <img 
          src={course.imageUrl} 
          alt={title}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
        
        {/* Back Button */}
        <Link 
          href={`/${locale}/courses`}
          className="absolute top-28 left-8 z-10 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <span className="text-2xl">&#8592;</span>
          <span className="font-bold">{language === 'zh' ? '返回' : 'Back'}</span>
        </Link>

        {/* Share Button */}
        <button 
          onClick={handleShare}
          className="absolute top-28 right-8 z-10 w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white text-xl"
        >
          &#128228;
        </button>
        
        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="px-4 py-1.5 bg-vs text-white text-xs font-black uppercase tracking-widest rounded-lg">
                {course.specialty}
              </span>
              <span className="px-4 py-1.5 bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-lg backdrop-blur">
                {course.level}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight max-w-4xl">
              {title}
            </h1>
            <div className="flex flex-wrap gap-6 text-white/80 text-sm font-bold">
              <span className="flex items-center gap-2">
                &#128197; {course.startDate} - {course.endDate}
              </span>
              <span className="flex items-center gap-2">
                &#128205; {course.location.city}, {course.location.venue}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 mb-4">
                {language === 'zh' ? '课程简介' : 'Course Overview'}
              </h2>
              <p className="text-slate-600 leading-relaxed text-lg">{desc}</p>
            </div>

            {/* Instructor */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 mb-6">
                {language === 'zh' ? '主讲导师' : 'Course Instructor'}
              </h2>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <img 
                  src={course.instructor.imageUrl} 
                  alt={course.instructor.name}
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-slate-50 shadow-lg"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-900 mb-1">{course.instructor.name}</h3>
                  <p className="text-sm font-bold text-vs uppercase tracking-widest mb-3">{course.instructor.title}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {course.instructor.credentials.map((cred, idx) => (
                      <span key={idx} className="px-3 py-1 bg-emerald-50 text-vs text-xs font-bold rounded-full">
                        {cred}
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-600 leading-relaxed italic border-l-4 border-vs pl-4">
                    &quot;{course.instructor.bio}&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Agenda */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 mb-6">
                &#128337; {language === 'zh' ? '课程大纲' : 'Course Agenda'}
              </h2>
              <div className="space-y-4">
                {course.agenda.map((day, dIdx) => (
                  <div key={dIdx} className="border border-slate-100 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                      <span className="bg-vs/10 text-vs px-3 py-1.5 rounded text-xs font-black uppercase tracking-widest">
                        {day.day}
                      </span>
                      <span className="text-sm font-bold text-slate-500">{day.date}</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {day.items.map((item, iIdx) => (
                        <div key={iIdx} className="p-6 flex gap-4 hover:bg-slate-50 transition-colors group">
                          <div className="w-3 h-3 mt-2 rounded-full bg-slate-200 group-hover:bg-vs transition-colors shrink-0"></div>
                          <div className="flex-1">
                            <span className="font-mono text-sm font-bold text-slate-400 block mb-1">{item.time}</span>
                            <p className="text-base font-bold text-slate-800">{item.activity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              {/* Pricing Card */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h3 className="font-black text-xl mb-6">
                  {language === 'zh' ? '课程费用' : 'Course Tuition'}
                </h3>
                
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">
                      {language === 'zh' ? '主会场' : 'General Admission'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {language === 'zh' ? '含拼房住宿' : 'Includes Accommodation'}
                    </p>
                  </div>
                  {isAuthenticated ? (
                    <span className="text-3xl font-black text-vs">
                      {course.currency === 'CNY' ? '¥' : '$'}{course.price.toLocaleString()}
                    </span>
                  ) : (
                    <button 
                      onClick={() => router.push(`/${locale}/auth`)}
                      className="text-sm font-black text-vs hover:underline flex items-center gap-1"
                    >
                      &#128274; {language === 'zh' ? '登录查看' : 'Login to View'}
                    </button>
                  )}
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

                <button 
                  onClick={handleRegister} 
                  className="w-full bg-vs text-white py-4 rounded-2xl font-black text-base shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  &#128722; {isAuthenticated 
                    ? (language === 'zh' ? '立即报名' : 'Enroll Now') 
                    : (language === 'zh' ? '登录后报名' : 'Login to Register')}
                </button>
              </div>

              {/* Course Details */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'zh' ? '难度等级' : 'Level'}
                    </span>
                    <span className="bg-slate-100 px-3 py-1 rounded text-xs font-black">{course.level}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'zh' ? '专业方向' : 'Specialty'}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{course.specialty}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'zh' ? '授课地点' : 'Location'}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{course.location.city}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'zh' ? '总时长' : 'Duration'}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {course.agenda.length} {language === 'zh' ? '天' : 'Days'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailClient;
