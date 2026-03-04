import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import IntlCourseDetailClient from '@vetsphere/shared/pages/intl/IntlCourseDetailClient';
import { siteConfig } from '@/config/site.config';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const courseUrl = `${siteConfig.siteUrl}/${locale}/courses/${id}`;

  return {
    title: `Training Program | VetSphere`,
    description: 'Expert-led veterinary training program with recommended equipment kits.',
    openGraph: {
      title: 'Training Program | VetSphere',
      url: courseUrl,
      type: 'website',
    },
    alternates: {
      canonical: courseUrl,
      languages: Object.fromEntries(
        siteConfig.locales.map((l: string) => [l, `${siteConfig.siteUrl}/${l}/courses/${id}`])
      ),
    },
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { locale, id } = await params;

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: `${siteConfig.siteUrl}/${locale}` },
        { name: 'Training', url: `${siteConfig.siteUrl}/${locale}/courses` },
        { name: 'Course Details', url: `${siteConfig.siteUrl}/${locale}/courses/${id}` },
      ])} />
      <IntlCourseDetailClient courseSlug={id} />
    </>
  );
}
