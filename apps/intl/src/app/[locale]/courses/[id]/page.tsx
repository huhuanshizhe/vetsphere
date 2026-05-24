import type { Metadata } from 'next';
import { cache } from 'react';
import { permanentRedirect } from 'next/navigation';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import IntlCourseDetailClient from '@vetsphere/shared/pages/intl/IntlCourseDetailClient';
import {
  getIntlCourseAgenda,
  getIntlCourseBySlug,
  getIntlCourseChapters,
  getIntlCourseInstructors,
  getIntlCourseProducts,
  getIntlCourseServices,
} from '@vetsphere/shared/services/intl-api';
import { siteConfig } from '@/config/site.config';
import { buildCourseDetailHref, buildLocaleAlternates } from '@/lib/seo';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

const getIntlCourse = cache(async (slugOrId: string, locale: string) => {
  return getIntlCourseBySlug(slugOrId, locale);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const course = await getIntlCourse(id, locale);
  const canonicalPath = buildCourseDetailHref(locale, {
    slug: course?.slug,
    id: course?.course_id || id,
  });
  const courseUrl = `${siteConfig.siteUrl}${canonicalPath}`;
  const title = course?.title ? `${course.title} | VetSphere` : 'Training Program | VetSphere';
  const description =
    course?.summary || 'Expert-led veterinary training program with recommended equipment kits.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: courseUrl,
      type: 'website',
    },
    alternates: buildLocaleAlternates({
      path: canonicalPath.replace(`/${locale}`, ''),
      canonicalLocale: locale,
      xDefaultUrl: `${siteConfig.siteUrl}${buildCourseDetailHref(siteConfig.defaultLocale, {
        slug: course?.slug,
        id: course?.course_id || id,
      })}`,
    }),
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const course = await getIntlCourse(id, locale);
  const canonicalPath = buildCourseDetailHref(locale, {
    slug: course?.slug,
    id: course?.course_id || id,
  });

  if (course && canonicalPath !== `/${locale}/courses/${id}`) {
    permanentRedirect(canonicalPath);
  }

  const [instructors, chapters, equipmentProducts, agenda, services] = course
    ? await Promise.all([
        getIntlCourseInstructors(course.course_id, locale),
        getIntlCourseChapters(course.course_id),
        getIntlCourseProducts(course.course_id, locale),
        getIntlCourseAgenda(course.course_id, locale),
        getIntlCourseServices(course.course_id, locale),
      ])
    : [[], [], [], [], []];

  const courseName = course?.title || 'Course Details';

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: `${siteConfig.siteUrl}/${locale}` },
        { name: 'Training', url: `${siteConfig.siteUrl}/${locale}/courses` },
        { name: courseName, url: `${siteConfig.siteUrl}${canonicalPath}` },
      ])} />
      <IntlCourseDetailClient
        courseSlug={course?.slug || id}
        initialData={{
          locale,
          courseSlug: course?.slug || id,
          course,
          instructors,
          chapters,
          equipmentProducts,
          agenda,
          services,
        }}
      />
    </>
  );
}
