import { IntlAboutPageClient } from '@vetsphere/shared/pages/intl/IntlAboutPageClient';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  
  const titles: Record<string, string> = {
    en: 'About Us | VetSphere Training Academy',
    th: 'เกี่ยวกับเรา | VetSphere Training Academy',
    ja: '会社概要 | VetSphere Training Academy',
  };

  const descriptions: Record<string, string> = {
    en: 'Learn about VetSphere Training Academy - professional veterinary training programs for veterinarians worldwide.',
    th: 'เรียนรู้เกี่ยวกับ VetSphere Training Academy - โปรแกรมการฝึกอบรมสัตวแพทย์มืออาชีพสำหรับสัตวแพทย์ทั่วโลก',
    ja: 'VetSphere Training Academyについて - 世界中の獣医師向けのプロフェッショナルな獣医研修プログラム',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  return <IntlAboutPageClient locale={locale} />;
}
