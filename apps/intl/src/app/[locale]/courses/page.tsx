import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import IntlCoursesPageClient from '@vetsphere/shared/pages/intl/IntlCoursesPageClient';
import { getIntlCourseProducts, getIntlCourses } from '@vetsphere/shared/services/intl-api';
import { siteConfig } from '@/config/site.config';
import { buildLocaleAlternates } from '@/lib/seo';

type SearchParamValue = string | string[] | undefined;

const COURSE_PAGE_SIZE = 12;

function getSingleSearchParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, SearchParamValue>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    en: 'Veterinary Training Programs | VetSphere',
    th: 'โปรแกรมฝึกอบรมสัตวแพทย์ | VetSphere',
    ja: '獣医トレーニングプログラム | VetSphere',
  };

  const descriptions: Record<string, string> = {
    en: 'Expert-led veterinary training programs: orthopedic surgery, soft tissue, ophthalmology, and ultrasound. Build clinical skills with hands-on workshops and discover recommended equipment.',
    th: 'โปรแกรมฝึกอบรมสัตวแพทย์โดยผู้เชี่ยวชาญ: ศัลยกรรมกระดูก, เนื้อเยื่ออ่อน, จักษุวิทยา และอัลตราซาวนด์',
    ja: '専門家による獣医トレーニングプログラム：整形外科手術、軟部組織、眼科、超音波',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    keywords: ['veterinary training', 'clinical workshops', 'TPLO training', 'veterinary surgery courses', 'equipment kits'],
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${siteConfig.siteUrl}/${locale}/courses`,
      siteName: siteConfig.siteName,
      type: 'website',
    },
    alternates: buildLocaleAlternates({
      path: 'courses',
      canonicalLocale: locale,
      xDefaultUrl: `${siteConfig.siteUrl}/${siteConfig.defaultLocale}/courses`,
    }),
  };
}

export default async function CoursesPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const specialty = getSingleSearchParam((await searchParams).specialty) || 'All';
  const initialRequestKey = JSON.stringify({
    locale,
    specialty,
    level: 'All',
    format: 'All',
    page: 0,
  });
  const courseResult = await getIntlCourses({
    specialty: specialty !== 'All' ? specialty : undefined,
    limit: COURSE_PAGE_SIZE,
    offset: 0,
    locale,
  });
  const equipmentCounts = Object.fromEntries(
    await Promise.all(
      courseResult.items.map(async (course) => {
        try {
          const products = await getIntlCourseProducts(course.course_id, locale);
          return [course.course_id, products.length] as const;
        } catch {
          return [course.course_id, 0] as const;
        }
      }),
    ),
  ) as Record<string, number>;

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: `${siteConfig.siteUrl}/${locale}` },
        { name: 'Training', url: `${siteConfig.siteUrl}/${locale}/courses` },
      ])} />
      <IntlCoursesPageClient
        initialData={{
          locale,
          courses: courseResult.items,
          total: courseResult.total,
          equipmentCounts,
          initialSpecialty: specialty,
          requestKey: initialRequestKey,
        }}
      />
    </>
  );
}
