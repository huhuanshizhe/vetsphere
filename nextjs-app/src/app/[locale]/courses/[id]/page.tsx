import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd, { courseSchema, breadcrumbSchema } from '@/components/JsonLd';
import CourseDetailClient from './CourseDetailClient';
import { COURSES_CN, COURSES_EN, COURSES_TH } from '@/lib/constants';
import { Course, Specialty } from '@/types';
import { supabase } from '@/services/supabase';

const SITE_URL = 'https://vetsphere.com';
const locales = ['en', 'zh', 'th'] as const;
type Locale = (typeof locales)[number];

// Get course data by ID - tries DB first, falls back to constants
async function getCourseById(id: string): Promise<Course | undefined> {
  try {
    const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();
    if (!error && data) {
      const c = data as any;
      return {
        id: c.id, title: c.title, specialty: c.specialty, level: c.level,
        price: c.price, currency: c.currency || 'CNY',
        startDate: c.start_date, endDate: c.end_date,
        location: c.location || {}, instructor: c.instructor || {},
        imageUrl: c.image_url, description: c.description,
        status: c.status || 'Published', agenda: c.agenda || []
      } as Course;
    }
  } catch {}
  return COURSES_CN.find(c => c.id === id);
}

// Get localized title
function getLocalizedTitle(course: Course, locale: Locale): string {
  if (locale === 'zh' && course.title_zh) return course.title_zh;
  if (locale === 'th' && course.title_th) return course.title_th;
  return course.title;
}

// Get localized description
function getLocalizedDescription(course: Course, locale: Locale): string {
  if (locale === 'zh' && course.description_zh) return course.description_zh;
  if (locale === 'th' && course.description_th) return course.description_th;
  return course.description;
}

// Generate static params for all courses
export async function generateStaticParams() {
  const params: { locale: string; id: string }[] = [];
  
  // Try DB first
  try {
    const { data } = await supabase.from('courses').select('id');
    if (data && data.length > 0) {
      for (const locale of locales) {
        for (const row of data) {
          params.push({ locale, id: (row as any).id });
        }
      }
      return params;
    }
  } catch {}

  // Fallback to constants
  for (const locale of locales) {
    for (const course of COURSES_CN) {
      params.push({ locale, id: course.id });
    }
  }
  
  return params;
}

// Dynamic metadata for SEO
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string; id: string }> 
}): Promise<Metadata> {
  const { locale, id } = await params;
  const course = await getCourseById(id);
  
  if (!course) {
    return {
      title: 'Course Not Found',
      description: 'The requested course could not be found.',
    };
  }

  const title = getLocalizedTitle(course, locale as Locale);
  const description = getLocalizedDescription(course, locale as Locale);
  const courseUrl = `${SITE_URL}/${locale}/courses/${id}`;

  return {
    title: `${title} | VetSphere`,
    description: `${description} Instructor: ${course.instructor.name}. Location: ${course.location.city}. Date: ${course.startDate} - ${course.endDate}.`,
    keywords: [
      course.specialty,
      course.level,
      'veterinary surgery course',
      'wet-lab training',
      course.instructor.name,
      course.location.city,
    ],
    openGraph: {
      title,
      description,
      url: courseUrl,
      type: 'website',
      images: [
        {
          url: course.imageUrl,
          width: 800,
          height: 600,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [course.imageUrl],
    },
    alternates: {
      canonical: courseUrl,
      languages: {
        'en': `${SITE_URL}/en/courses/${id}`,
        'zh-CN': `${SITE_URL}/zh/courses/${id}`,
        'th': `${SITE_URL}/th/courses/${id}`,
      },
    },
  };
}

export default async function CourseDetailPage({ 
  params 
}: { 
  params: Promise<{ locale: string; id: string }> 
}) {
  const { locale, id } = await params;
  const course = await getCourseById(id);

  if (!course) {
    notFound();
  }

  const title = getLocalizedTitle(course, locale as Locale);

  return (
    <>
      {/* Breadcrumb Schema */}
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: `${SITE_URL}/${locale}` },
        { name: 'Courses', url: `${SITE_URL}/${locale}/courses` },
        { name: title, url: `${SITE_URL}/${locale}/courses/${id}` },
      ])} />
      
      {/* Course Schema */}
      <JsonLd data={courseSchema({
        title,
        description: getLocalizedDescription(course, locale as Locale),
        instructor: course.instructor,
        startDate: course.startDate,
        endDate: course.endDate,
        location: course.location,
        price: course.price,
        currency: course.currency,
        imageUrl: course.imageUrl,
      })} />
      
      <CourseDetailClient courseId={id} />
    </>
  );
}
