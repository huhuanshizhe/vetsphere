import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import IntlCoursesPageClient from '@vetsphere/shared/pages/intl/IntlCoursesPageClient';
import { siteConfig } from '@/config/site.config';

interface PageProps {
  params: Promise<{ locale: string }>;
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
    alternates: {
      languages: Object.fromEntries(
        siteConfig.locales.map((l: string) => [l, `${siteConfig.siteUrl}/${l}/courses`])
      ),
    },
  };
}

export default async function CoursesPage({ params }: PageProps) {
  const { locale } = await params;
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: `${siteConfig.siteUrl}/${locale}` },
        { name: 'Training', url: `${siteConfig.siteUrl}/${locale}/courses` },
      ])} />
      <IntlCoursesPageClient />
    </>
  );
}
