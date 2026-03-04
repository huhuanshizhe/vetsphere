import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import IntlShopPageClient from '@vetsphere/shared/pages/intl/IntlShopPageClient';
import { siteConfig } from '@/config/site.config';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    en: 'Veterinary Equipment & Instruments | VetSphere',
    th: 'อุปกรณ์และเครื่องมือสัตวแพทย์ | VetSphere',
    ja: '獣医機器・器具 | VetSphere',
  };

  const descriptions: Record<string, string> = {
    en: 'Training-compatible veterinary equipment: surgical instruments, implants, power tools, and monitoring systems. Purchase directly or request a custom quote.',
    th: 'อุปกรณ์สัตวแพทย์ที่เข้ากันได้กับการฝึกอบรม: เครื่องมือผ่าตัด, อุปกรณ์ปลูกถ่าย, เครื่องมือไฟฟ้า',
    ja: 'トレーニング対応獣医機器：手術器具、インプラント、電動工具、モニタリングシステム',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    keywords: ['veterinary equipment', 'surgical instruments', 'TPLO saw', 'veterinary implants', 'clinical tools'],
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${siteConfig.siteUrl}/${locale}/shop`,
      siteName: siteConfig.siteName,
      type: 'website',
    },
    alternates: {
      languages: Object.fromEntries(
        siteConfig.locales.map((l: string) => [l, `${siteConfig.siteUrl}/${l}/shop`])
      ),
    },
  };
}

export default async function ShopPage({ params }: PageProps) {
  const { locale } = await params;
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: `${siteConfig.siteUrl}/${locale}` },
        { name: 'Equipment', url: `${siteConfig.siteUrl}/${locale}/shop` },
      ])} />
      <IntlShopPageClient />
    </>
  );
}
