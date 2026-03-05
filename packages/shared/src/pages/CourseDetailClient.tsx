'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '../services/api';
import { Course, CourseProductRelation } from '../types';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import { getLocalizedPrice } from '../services/translation';
import CourseEquipmentSidebar from '../components/CourseEquipmentSidebar';
import CourseEquipmentByModule from '../components/CourseEquipmentByModule';
import InstructorToolsBlock from '../components/InstructorToolsBlock';
import ClinicalConsultationModal from '../components/ClinicalConsultationModal';

interface CourseDetailClientProps {
  courseId: string;
}

// Upgrade outcomes by specialty for INTL "What You Will Upgrade" block
const upgradeOutcomesBySpecialty: Record<string, Record<string, string[]>> = {
  Orthopedics: {
    en: ['Perform TPLO and fracture repair independently', 'Reduce surgical complication rates', 'Adopt minimally invasive orthopedic techniques', 'Expand your orthopedic case acceptance range'],
    th: ['ทำ TPLO และซ่อมแซมกระดูกหักได้อย่างอิสระ', 'ลดอัตราภาวะแทรกซ้อนจากการผ่าตัด', 'ใช้เทคนิคกระดูกและข้อแบบบุกรุกน้อยที่สุด', 'ขยายขอบเขตการรับเคสออร์โธปิดิกส์'],
    ja: ['TPLOと骨折修復を独立して実施', '手術合併症率の低減', '低侵襲整形外科技術の導入', '整形外科症例の受け入れ範囲を拡大'],
  },
  Neurosurgery: {
    en: ['Master spinal stabilization procedures', 'Handle emergency neurological cases with confidence', 'Perform IVDD decompression independently', 'Implement advanced neurological monitoring protocols'],
    th: ['เชี่ยวชาญขั้นตอนการรักษาเสถียรภาพกระดูกสันหลัง', 'จัดการกรณีฉุกเฉินทางระบบประสาทอย่างมั่นใจ', 'ทำ IVDD decompression ได้อย่างอิสระ', 'นำโปรโตคอลการติดตามทางระบบประสาทขั้นสูงมาใช้'],
    ja: ['脊椎安定化手術のマスター', '緊急神経学的症例への自信を持った対応', 'IVDD減圧手術の独立実施', '高度な神経学的モニタリングプロトコルの導入'],
  },
  'Soft Tissue': {
    en: ['Advanced abdominal surgery techniques', 'Thoracoscopy and laparoscopy skills', 'Oncologic reconstruction confidence', 'Minimally invasive soft tissue procedures'],
    th: ['เทคนิคการผ่าตัดช่องท้องขั้นสูง', 'ทักษะการส่องกล้องทรวงอกและช่องท้อง', 'ความมั่นใจในการสร้างเสริมทางมะเร็งวิทยา', 'การผ่าตัดเนื้อเยื่ออ่อนแบบบุกรุกน้อยที่สุด'],
    ja: ['高度な腹部手術技術', '胸腔鏡・腹腔鏡スキル', '腫瘍再建の自信', '低侵襲軟部組織手術'],
  },
};

const defaultUpgradeOutcomes: Record<string, string[]> = {
  en: ['Expand your surgical case repertoire', 'Adopt standardized clinical protocols', 'Reduce complication rates with proven techniques', 'Elevate patient outcomes through advanced methodology'],
  th: ['ขยายขอบเขตเคสศัลยกรรมของคุณ', 'นำโปรโตคอลคลินิกมาตรฐานมาใช้', 'ลดอัตราภาวะแทรกซ้อนด้วยเทคนิคที่พิสูจน์แล้ว', 'ยกระดับผลลัพธ์ผู้ป่วยด้วยวิธีการขั้นสูง'],
  ja: ['手術症例のレパートリーを拡大', '標準化された臨床プロトコルの導入', '実証済み技術で合併症率を低減', '高度な方法論で患者アウトカムを向上'],
};

function getUpgradeOutcomes(specialty: string, lang: string): string[] {
  const langKey = ['en', 'th', 'ja'].includes(lang) ? lang : 'en';
  return upgradeOutcomesBySpecialty[specialty]?.[langKey] || defaultUpgradeOutcomes[langKey] || defaultUpgradeOutcomes.en;
}

const CourseDetailClient: React.FC<CourseDetailClientProps> = ({ courseId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { addNotification } = useNotification();
  const { addToCart } = useCart();
  const { isINTL } = useSiteConfig();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [equipmentRelations, setEquipmentRelations] = useState<CourseProductRelation[]>([]);
  const [relatedCourses, setRelatedCourses] = useState<Course[]>([]);
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);

  // Get current locale from pathname
  const locale = pathname.split('/')[1] || 'en';

  useEffect(() => {
    api.getCourses().then(courses => {
      const found = courses.find(c => c.id === courseId);
      setCourse(found || null);
      setLoading(false);
      // For INTL: find related courses (same specialty, different id, published)
      if (found) {
        const related = courses.filter(c => 
          c.id !== found.id && 
          c.specialty === found.specialty && 
          c.status === 'Published'
        ).slice(0, 2);
        setRelatedCourses(related);
      }
    });
  }, [courseId]);

  // Fetch equipment relations
  useEffect(() => {
    fetch(`/api/courses/${courseId}/products`)
      .then(res => res.ok ? res.json() : { relations: [] })
      .then(data => setEquipmentRelations(data.relations || []))
      .catch(() => setEquipmentRelations([]));
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
    } else if (language === 'ja') {
      title = course.title_ja || course.title;
      desc = course.description_ja || course.description;
    }
    return { title, desc };
  };

  // Helper for localized instructor info
  const getLocalizedInstructor = (course: Course) => {
    const inst = course.instructor || {};
    const defaultCreds: string[] = [];
    if (language === 'zh') {
      return {
        name: inst.name_zh || inst.name || '',
        title: inst.title_zh || inst.title || '',
        bio: inst.bio_zh || inst.bio || '',
        credentials: inst.credentials_zh || inst.credentials || defaultCreds,
      };
    } else if (language === 'th') {
      return {
        name: inst.name_th || inst.name || '',
        title: inst.title_th || inst.title || '',
        bio: inst.bio_th || inst.bio || '',
        credentials: inst.credentials_th || inst.credentials || defaultCreds,
      };
    } else if (language === 'ja') {
      return {
        name: inst.name_ja || inst.name || '',
        title: inst.title_ja || inst.title || '',
        bio: inst.bio_ja || inst.bio || '',
        credentials: inst.credentials_ja || inst.credentials || defaultCreds,
      };
    }
    return { 
      name: inst.name || '', 
      title: inst.title || '', 
      bio: inst.bio || '', 
      credentials: inst.credentials || defaultCreds 
    };
  };

  // Helper for localized location
  const getLocalizedLocation = (course: Course) => {
    const loc = course.location;
    if (language === 'zh') {
      return {
        city: loc.city_zh || loc.city,
        venue: loc.venue_zh || loc.venue,
        address: loc.address_zh || loc.address,
      };
    } else if (language === 'th') {
      return {
        city: loc.city_th || loc.city,
        venue: loc.venue_th || loc.venue,
        address: loc.address_th || loc.address,
      };
    } else if (language === 'ja') {
      return {
        city: loc.city_ja || loc.city,
        venue: loc.venue_ja || loc.venue,
        address: loc.address_ja || loc.address,
      };
    }
    return { city: loc.city, venue: loc.venue, address: loc.address };
  };

  // Helper for localized agenda activity
  const getLocalizedActivity = (item: { time: string; activity: string; activity_en?: string; activity_zh?: string; activity_th?: string; activity_ja?: string }) => {
    // First try suffix fields based on current language
    if (language === 'zh' && item.activity_zh) return item.activity_zh;
    if (language === 'th' && item.activity_th) return item.activity_th;
    if (language === 'ja' && item.activity_ja) return item.activity_ja;
    if (language === 'en' && item.activity_en) return item.activity_en;
    // Fallback to base activity field
    return item.activity;
  };

  // Helper for localized services text
  const getLocalizedServices = (course: Course) => {
    const services = course.services || {};
    const suffix = language === 'zh' ? '_zh' : language === 'th' ? '_th' : language === 'ja' ? '_ja' : '_en';
    return {
      directions: (services as Record<string, string>)[`directions${suffix}`] || services.directions || '',
      notes: (services as Record<string, string>)[`notes${suffix}`] || services.notes || '',
      accommodation: services.accommodation,
      meals: services.meals,
      transfer: services.transfer,
      visaLetter: services.visaLetter,
    };
  };

  // Teaching language labels
  const TEACHING_LANG_LABELS: Record<string, Record<string, string>> = {
    zh: { zh: '中文', en: 'English', ja: '日本語', th: 'ภาษาไทย' },
    en: { zh: 'Chinese', en: 'English', ja: 'Japanese', th: 'Thai' },
    ja: { zh: '中国語', en: '英語', ja: '日本語', th: 'タイ語' },
    th: { zh: 'จีน', en: 'อังกฤษ', ja: 'ญี่ปุ่น', th: 'ไทย' },
  };

  // Service status labels
  const getServiceLabel = (status: 'yes' | 'no' | 'partial' | undefined) => {
    if (!status) return null;
    const labels: Record<string, Record<string, string>> = {
      yes: { zh: '提供', en: 'Included', ja: '含む', th: 'รวม' },
      no: { zh: '不提供', en: 'Not Included', ja: '含まない', th: 'ไม่รวม' },
      partial: { zh: '部分提供', en: 'Partial', ja: '一部含む', th: 'บางส่วน' },
    };
    return labels[status]?.[language] || labels[status]?.['en'];
  };

  const handleRegister = () => {
    if (!course) return;
    
    if (!isAuthenticated) {
      router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
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
  const instructor = getLocalizedInstructor(course);
  const location = getLocalizedLocation(course);
  const services = getLocalizedServices(course);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative h-[50vh] min-h-[400px] bg-slate-900">
        {course.imageUrl && (
          <img 
            src={course.imageUrl} 
            alt={title}
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
        
        {/* Back Button */}
        <Link 
          href={`/${locale}/courses`}
          className="absolute top-28 left-8 z-10 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <span className="text-2xl">&#8592;</span>
          <span className="font-bold">{language === 'zh' ? '返回' : language === 'ja' ? '戻る' : 'Back'}</span>
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
                &#128205; {location.city}, {location.venue}
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
                {language === 'zh' ? '课程简介' : language === 'ja' ? 'コース概要' : 'Course Overview'}
              </h2>
              <p className="text-slate-600 leading-relaxed text-lg">{desc}</p>
            </div>

            {/* INTL: What You Will Upgrade in Your Practice */}
            {isINTL && (
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-3xl p-8 border border-emerald-100/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">
                    {language === 'ja' ? '臨床アップグレード' : language === 'th' ? 'อัปเกรดคลินิก' : 'Clinical Upgrade'}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-6">
                  {language === 'ja' ? '診療でアップグレードできること' : language === 'th' ? 'สิ่งที่คุณจะอัปเกรดในคลินิก' : 'What You Will Upgrade in Your Practice'}
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {getUpgradeOutcomes(course.specialty, language).map((outcome, idx) => {
                    const icons = [
                      <svg key="i" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
                      <svg key="i" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
                      <svg key="i" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
                      <svg key="i" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                    ];
                    return (
                      <div key={idx} className="bg-white/70 backdrop-blur rounded-2xl p-5 border border-white/80">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                          {icons[idx % icons.length]}
                        </div>
                        <p className="text-slate-800 font-bold text-sm leading-relaxed">{outcome}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Instructor */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 mb-6">
                {language === 'zh' ? '主讲导师' : language === 'ja' ? '講師紹介' : 'Course Instructor'}
              </h2>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {course.instructor.imageUrl && (
                  <img 
                    src={course.instructor.imageUrl} 
                    alt={instructor.name}
                    className="w-28 h-28 rounded-2xl object-cover border-4 border-slate-50 shadow-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-900 mb-1">{instructor.name}</h3>
                  <p className="text-sm font-bold text-vs uppercase tracking-widest mb-3">{instructor.title}</p>
                  {instructor.credentials && instructor.credentials.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {instructor.credentials.map((cred, idx) => (
                        <span key={idx} className="px-3 py-1 bg-emerald-50 text-vs text-xs font-bold rounded-full">
                          {cred}
                        </span>
                      ))}
                    </div>
                  )}
                  {instructor.bio && (
                    <p className="text-slate-600 leading-relaxed italic border-l-4 border-vs pl-4">
                      &quot;{instructor.bio}&quot;
                    </p>
                  )}
                  {/* Instructor Recommended Tools */}
                  <InstructorToolsBlock relations={equipmentRelations} locale={locale} instructorName={instructor.name} />
                </div>
              </div>
            </div>

            {/* Agenda */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 mb-6">
                &#128337; {language === 'zh' ? '课程大纲' : language === 'ja' ? 'スケジュール' : 'Course Agenda'}
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
                            <p className="text-base font-bold text-slate-800">{getLocalizedActivity(item)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Services - Travel & Accommodation */}
            {(services.accommodation || services.meals || services.transfer || services.visaLetter || services.directions || services.notes) && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h2 className="text-2xl font-black text-slate-900 mb-6">
                  &#9992;&#65039; {language === 'zh' ? '行程服务安排' : language === 'ja' ? '旅程サービス' : 'Travel & Services'}
                </h2>
                
                {/* Service Items Grid */}
                {(services.accommodation || services.meals || services.transfer || services.visaLetter) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {services.accommodation && (
                      <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <span className="text-2xl block mb-2">&#127976;</span>
                        <p className="text-xs font-bold text-slate-500 mb-1">
                          {language === 'zh' ? '住宿' : language === 'ja' ? '宿泊' : 'Accommodation'}
                        </p>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          services.accommodation === 'yes' ? 'bg-emerald-100 text-emerald-700' :
                          services.accommodation === 'partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {getServiceLabel(services.accommodation)}
                        </span>
                      </div>
                    )}
                    {services.meals && (
                      <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <span className="text-2xl block mb-2">&#127869;&#65039;</span>
                        <p className="text-xs font-bold text-slate-500 mb-1">
                          {language === 'zh' ? '餐饮' : language === 'ja' ? '食事' : 'Meals'}
                        </p>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          services.meals === 'yes' ? 'bg-emerald-100 text-emerald-700' :
                          services.meals === 'partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {getServiceLabel(services.meals)}
                        </span>
                      </div>
                    )}
                    {services.transfer && (
                      <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <span className="text-2xl block mb-2">&#128663;</span>
                        <p className="text-xs font-bold text-slate-500 mb-1">
                          {language === 'zh' ? '接送' : language === 'ja' ? '送迎' : 'Transfer'}
                        </p>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          services.transfer === 'yes' ? 'bg-emerald-100 text-emerald-700' :
                          services.transfer === 'partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {getServiceLabel(services.transfer)}
                        </span>
                      </div>
                    )}
                    {services.visaLetter && (
                      <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <span className="text-2xl block mb-2">&#128196;</span>
                        <p className="text-xs font-bold text-slate-500 mb-1">
                          {language === 'zh' ? '签证函' : language === 'ja' ? 'ビザレター' : 'Visa Letter'}
                        </p>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          services.visaLetter === 'yes' ? 'bg-emerald-100 text-emerald-700' :
                          services.visaLetter === 'partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {getServiceLabel(services.visaLetter)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Directions */}
                {services.directions && (
                  <div className="mb-4">
                    <h3 className="text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
                      &#128506;&#65039; {language === 'zh' ? '交通指南' : language === 'ja' ? '交通案内' : 'Directions'}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl">
                      {services.directions}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {services.notes && (
                  <div>
                    <h3 className="text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
                      &#128221; {language === 'zh' ? '其他备注' : language === 'ja' ? 'その他' : 'Additional Notes'}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl">
                      {services.notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Equipment & Consumables by Training Module */}
            <div id="equipment-modules">
              <CourseEquipmentByModule 
                relations={equipmentRelations} 
                locale={locale}
                agenda={course.agenda}
                initialCollapsed={isINTL}
              />
            </div>

            {/* INTL: After Completing This Course, Upgrade Further */}
            {isINTL && (relatedCourses.length > 0 || equipmentRelations.filter(r => r.relationshipType !== 'required').length > 0) && (
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {language === 'ja' ? '次のステップ' : language === 'th' ? 'ขั้นตอนถัดไป' : 'Next Steps'}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">
                  {language === 'ja' ? 'このコース修了後、さらにアップグレード' : language === 'th' ? 'หลังจบหลักสูตรนี้ อัปเกรดต่อ' : 'After Completing This Course, Upgrade Further'}
                </h2>
                <p className="text-slate-500 mb-6">
                  {language === 'ja' ? '高度な機器と関連トレーニングで臨床能力を拡大' :
                   language === 'th' ? 'ขยายความสามารถทางคลินิกด้วยอุปกรณ์ขั้นสูงและการฝึกอบรมที่เกี่ยวข้อง' :
                   'Expand your clinical capability with advanced equipment and related training'}
                </p>

                {/* Advanced Equipment */}
                {(() => {
                  const advancedEquipment = equipmentRelations
                    .filter(r => r.relationshipType !== 'required' && r.product)
                    .slice(0, 2);
                  if (advancedEquipment.length === 0) return null;
                  return (
                    <div className="mb-6">
                      <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-3">
                        {language === 'ja' ? '推奨アドバンスト機器' : language === 'th' ? 'อุปกรณ์ขั้นสูงที่แนะนำ' : 'Recommended Advanced Equipment'}
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {advancedEquipment.map(relation => {
                          const product = relation.product!;
                          return (
                            <Link
                              key={relation.id}
                              href={`/${locale}/shop/${product.id}`}
                              className="group flex gap-4 bg-white rounded-2xl p-4 border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                            >
                              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded mb-1 inline-block">
                                  {relation.relationshipType === 'recommended'
                                    ? (language === 'ja' ? '推奨' : language === 'th' ? 'แนะนำ' : 'Recommended')
                                    : (language === 'ja' ? '関連' : language === 'th' ? 'เกี่ยวข้อง' : 'Featured')}
                                </span>
                                <h4 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-vs transition-colors">{product.name}</h4>
                                <p className="text-xs text-slate-400 mt-0.5">{product.brand}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Related Courses */}
                {relatedCourses.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-3">
                      {language === 'ja' ? '次のトレーニングプログラム' : language === 'th' ? 'โปรแกรมฝึกอบรมถัดไป' : 'Next Training Programs'}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {relatedCourses.map(rc => {
                        const rcTitle = language === 'th' ? (rc.title_th || rc.title) :
                                        language === 'ja' ? (rc.title_ja || rc.title) :
                                        language === 'zh' ? (rc.title_zh || rc.title) : rc.title;
                        return (
                          <Link
                            key={rc.id}
                            href={`/${locale}/courses/${rc.id}`}
                            className="group flex gap-4 bg-white rounded-2xl p-4 border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                          >
                            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={rc.imageUrl} alt={rcTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">{rc.specialty}</span>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">{rc.level}</span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-vs transition-colors">{rcTitle}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {rc.location?.city} &middot; {rc.startDate ? new Date(rc.startDate).toLocaleDateString(locale, { month: 'short', year: 'numeric' }) : ''}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              {/* Pricing Card */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h3 className="font-black text-xl mb-6">
                  {language === 'zh' ? '课程费用' : language === 'ja' ? '受講料' : 'Course Tuition'}
                </h3>
                
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">
                      {language === 'zh' ? '课程报名' : language === 'ja' ? '受講料' : 'Registration Fee'}
                    </p>
                  </div>
                  {isAuthenticated ? (
                    <span className="text-3xl font-black text-vs">
                      {(() => { const p = getLocalizedPrice(course, language); return `${p.symbol}${p.price.toLocaleString()}`; })()}
                    </span>
                  ) : (
                    <button 
                      onClick={() => router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`)}
                      className="text-sm font-black text-vs hover:underline flex items-center gap-1"
                    >
                      &#128274; {language === 'zh' ? '登录查看' : language === 'ja' ? 'ログインして確認' : 'Login to View'}
                    </button>
                  )}
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex justify-between text-sm font-bold text-slate-500">
                    <span>{language === 'zh' ? '名额' : language === 'ja' ? '定員' : 'Capacity'}</span>
                    <span>{course.enrolledCount ?? 0} / {course.maxCapacity ?? 30}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-500">
                    <span>{language === 'zh' ? '报名截止' : language === 'ja' ? '申込締切' : 'Deadline'}</span>
                    <span>{course.enrollmentDeadline ? course.enrollmentDeadline.split('T')[0] : 'TBD'}</span>
                  </div>
                </div>

                <button 
                  onClick={handleRegister} 
                  className="w-full bg-vs text-white py-4 rounded-2xl font-black text-base shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  &#128722; {isAuthenticated 
                    ? (language === 'zh' ? '立即报名' : language === 'ja' ? '今すぐ申込' : 'Enroll Now') 
                    : (language === 'zh' ? '登录后报名' : language === 'ja' ? 'ログインして申込' : 'Login to Register')}
                </button>

                {/* INTL: Equipment disclaimer + equipment count link */}
                {isINTL && (
                  <p className="mt-3 text-[11px] text-slate-400 text-center leading-relaxed">
                    {language === 'ja' ? 'トレーニング中の機器ハンズオン含む。臨床使用は別途購入。' :
                     language === 'th' ? 'รวมการใช้งานอุปกรณ์ระหว่างฝึกอบรม การใช้ทางคลินิกต้องซื้อแยก' :
                     'Hands-on equipment included in training. Purchase separately for clinical use.'}
                  </p>
                )}
                {isINTL && equipmentRelations.length > 0 && (
                  <a
                    href="#equipment-modules"
                    className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-vs transition-colors group"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('equipment-modules')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <span className="font-medium">
                      {language === 'ja' ? `使用機器を見る (${equipmentRelations.length})` :
                       language === 'th' ? `ดูอุปกรณ์ที่ใช้ (${equipmentRelations.length})` :
                       `View equipment used (${equipmentRelations.length})`}
                    </span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </a>
                )}
              </div>

              {/* Equipment & Kits Sidebar - CN only (INTL uses collapsible section after agenda) */}
              {!isINTL && (
                <CourseEquipmentSidebar relations={equipmentRelations} locale={locale} />
              )}

              {/* Course Details */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'zh' ? '难度等级' : language === 'ja' ? 'レベル' : 'Level'}
                    </span>
                    <span className="bg-slate-100 px-3 py-1 rounded text-xs font-black">{course.level}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'zh' ? '专业方向' : language === 'ja' ? '専門分野' : 'Specialty'}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{course.specialty}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'zh' ? '授课地点' : language === 'ja' ? '開催地' : 'Location'}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{location.city}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'zh' ? '课程时长' : language === 'ja' ? '期間' : 'Duration'}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {course.agenda.length} {language === 'zh' ? '天' : language === 'ja' ? '日間' : 'Days'}
                      {course.totalHours && ` / ${course.totalHours}${language === 'zh' ? '小时' : language === 'ja' ? '時間' : 'h'}`}
                    </span>
                  </div>
                  {/* Teaching Languages */}
                  {course.teachingLanguages && course.teachingLanguages.length > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {language === 'zh' ? '授课语言' : language === 'ja' ? '講義言語' : 'Language'}
                      </span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {course.teachingLanguages.map((lang: string) => (
                          <span key={lang} className="bg-vs/10 text-vs px-2 py-0.5 rounded text-xs font-bold">
                            {TEACHING_LANG_LABELS[language]?.[lang] || lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INTL: Secure Your Seat Now - Final CTA */}
      {isINTL && (
        <div className="max-w-6xl mx-auto px-4 pb-16">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
              {language === 'ja' ? '今すぐ席を確保' : language === 'th' ? 'จองที่นั่งของคุณ' : 'Secure Your Seat Now'}
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto text-sm">
              {language === 'ja' ? `定員${course.maxCapacity ?? 30}名・早期登録をお勧めします` :
               language === 'th' ? `จำกัด ${course.maxCapacity ?? 30} ที่นั่ง — แนะนำให้ลงทะเบียนล่วงหน้า` :
               `Limited to ${course.maxCapacity ?? 30} participants — early registration recommended`}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleRegister}
                className="px-8 py-4 bg-vs text-white rounded-2xl font-black text-base shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2"
              >
                &#128722; {isAuthenticated
                  ? (language === 'ja' ? '今すぐ申込' : language === 'th' ? 'ลงทะเบียนเลย' : 'Enroll Now')
                  : (language === 'ja' ? 'ログインして申込' : language === 'th' ? 'เข้าสู่ระบบเพื่อลงทะเบียน' : 'Login to Register')}
              </button>
              <button
                onClick={() => setShowAdvisorModal(true)}
                className="px-8 py-4 bg-transparent border-2 border-slate-600 text-slate-300 rounded-2xl font-bold text-sm hover:border-slate-400 hover:text-white transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {language === 'ja' ? '臨床アドバイザーに相談' : language === 'th' ? 'พูดคุยกับที่ปรึกษาคลินิก' : 'Talk to a Clinical Advisor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Advisor Consultation Modal */}
      {course && (
        <ClinicalConsultationModal
          isOpen={showAdvisorModal}
          onClose={() => setShowAdvisorModal(false)}
          productId={courseId}
          productName={title}
        />
      )}
    </div>
  );
};

export default CourseDetailClient;
