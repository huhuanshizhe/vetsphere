import { IntlContactPageClient } from '@vetsphere/shared/pages/intl/IntlContactPageClient';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  
  const titles: Record<string, string> = {
    en: 'Contact Us | VetSphere Training Academy',
    th: 'ติดต่อเรา | VetSphere Training Academy',
    ja: 'お問い合わせ | VetSphere Training Academy',
  };

  const descriptions: Record<string, string> = {
    en: 'Contact VetSphere Training Academy for inquiries about our veterinary training programs and workshops.',
    th: 'ติดต่อ VetSphere Training Academy สำหรับการสอบถามเกี่ยวกับโปรแกรมการฝึกอบรมสัตวแพทย์และเวิร์คช็อปของเรา',
    ja: '獣医研修プログラムやワークショップに関するお問い合わせはVetSphere Training Academyまでご連絡ください',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
  };
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  return <IntlContactPageClient locale={locale} />;
}
