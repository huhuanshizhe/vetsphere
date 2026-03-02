'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import type { CourseProductRelation, Course } from '../types';

interface CourseRelationsBlockProps {
  productId: string;
  locale: string;
}

const translations = {
  en: {
    title: 'Used in Training Programs',
    subtitle: 'This equipment is featured in the following VetSphere courses',
    required: 'Required',
    recommended: 'Recommended',
    mentioned: 'Featured',
    viewCourse: 'View Course',
    instructorNote: 'Instructor Note',
    noRelations: 'No training programs currently feature this equipment.',
    loading: 'Loading training programs...',
  },
  th: {
    title: 'ใช้ในหลักสูตรฝึกอบรม',
    subtitle: 'อุปกรณ์นี้ถูกใช้ในหลักสูตร VetSphere ต่อไปนี้',
    required: 'จำเป็น',
    recommended: 'แนะนำ',
    mentioned: 'พูดถึง',
    viewCourse: 'ดูหลักสูตร',
    instructorNote: 'หมายเหตุจากวิทยากร',
    noRelations: 'ยังไม่มีหลักสูตรที่ใช้อุปกรณ์นี้',
    loading: 'กำลังโหลดหลักสูตร...',
  },
  ja: {
    title: 'トレーニングプログラムで使用',
    subtitle: 'この機器は以下のVetSphereコースで紹介されています',
    required: '必須',
    recommended: '推奨',
    mentioned: '紹介',
    viewCourse: 'コースを見る',
    instructorNote: '講師のコメント',
    noRelations: '現在、このような機器を紹介しているトレーニングプログラムはありません。',
    loading: 'トレーニングプログラムを読み込み中...',
  },
};

// Mock function - will be replaced with actual API call
async function getProductCourses(productId: string): Promise<CourseProductRelation[]> {
  try {
    const response = await fetch(`/api/products/${productId}/courses`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.relations || [];
  } catch {
    return [];
  }
}

const intlTranslations = {
  en: {
    title: 'Used in Our Training Programs',
    subtitle: 'Learn to use this equipment with expert guidance from board-certified specialists',
  },
  th: {
    title: 'ใช้ในโปรแกรมฝึกอบรมของเรา',
    subtitle: 'เรียนรู้การใช้อุปกรณ์นี้พร้อมคำแนะนำจากผู้เชี่ยวชาญที่ได้รับการรับรอง',
  },
  ja: {
    title: '当社トレーニングプログラムで使用',
    subtitle: '認定専門医の専門的なガイダンスのもとでこの機器の使い方を学ぶ',
  },
};

export default function CourseRelationsBlock({ productId, locale }: CourseRelationsBlockProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { isINTL } = useSiteConfig();
  const t = translations[language as keyof typeof translations] || translations.en;
  const intlT = intlTranslations[language as keyof typeof intlTranslations] || intlTranslations.en;

  const [relations, setRelations] = useState<CourseProductRelation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProductCourses(productId).then(data => {
      setRelations(data);
      setLoading(false);
    });
  }, [productId]);

  const getRelationLabel = (type: string) => {
    switch (type) {
      case 'required': return t.required;
      case 'recommended': return t.recommended;
      default: return t.mentioned;
    }
  };

  const getRelationColor = (type: string) => {
    switch (type) {
      case 'required': return 'bg-red-100 text-red-700';
      case 'recommended': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getInstructorNote = (relation: CourseProductRelation) => {
    switch (language) {
      case 'th': return relation.instructorNoteTh || relation.instructorNoteEn;
      case 'ja': return relation.instructorNoteJa || relation.instructorNoteEn;
      default: return relation.instructorNoteEn;
    }
  };

  const getCourseTitle = (course: Course) => {
    switch (language) {
      case 'th': return course.title_th || course.title;
      case 'ja': return course.title_ja || course.title;
      default: return course.title;
    }
  };

  // Don't render if no relations and not loading
  if (!loading && relations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <span>🎓</span> {isINTL ? intlT.title : t.title}
        </h3>
        <p className="text-sm text-slate-500 mt-1">{isINTL ? intlT.subtitle : t.subtitle}</p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-8 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-vs border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">{t.loading}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {relations.map(relation => {
            const course = relation.course;
            if (!course) return null;

            const instructorNote = getInstructorNote(relation);

            return (
              <div 
                key={relation.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-vs/50 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => router.push(`/${locale}/courses/${course.id}`)}
              >
                <div className="flex items-start gap-4">
                  {/* Course Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={course.imageUrl} 
                      alt={getCourseTitle(course)}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Course Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getRelationColor(relation.relationshipType)}`}>
                        {getRelationLabel(relation.relationshipType)}
                      </span>
                      <span className="text-xs text-slate-400">{course.specialty}</span>
                    </div>
                    
                    <h4 className="font-black text-slate-900 line-clamp-1 hover:text-vs transition-colors">
                      {getCourseTitle(course)}
                    </h4>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span>📅</span> {course.startDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>📍</span> {course.location?.city || 'Online'}
                      </span>
                    </div>

                    {/* Instructor Note */}
                    {instructorNote && (
                      <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">
                          {t.instructorNote}
                        </p>
                        <p className="text-sm text-amber-900 italic">"{instructorNote}"</p>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="text-slate-300 text-xl shrink-0">→</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
