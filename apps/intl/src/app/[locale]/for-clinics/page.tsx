import ForClinicsPageClient from '@vetsphere/shared/pages/intl/ForClinicsPageClient';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  
  const titles: Record<string, string> = {
    en: 'For Clinics | VetSphere Clinical Upgrade Platform',
    th: 'สำหรับคลินิก | VetSphere Clinical Upgrade Platform',
    ja: 'クリニック向け | VetSphere Clinical Upgrade Platform',
  };

  const descriptions: Record<string, string> = {
    en: 'Upgrade your clinic with coordinated training and equipment packages. Starter, Advanced, and Complete upgrade tiers for independent veterinary clinics.',
    th: 'อัปเกรดคลินิกของคุณด้วยแพ็คเกจการฝึกอบรมและอุปกรณ์แบบประสานงาน สำหรับคลินิกสัตวแพทย์อิสระ',
    ja: 'トレーニングと機器のパッケージでクリニックをアップグレード。独立した動物病院向けのアップグレードプラン。',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
  };
}

export default async function ForClinicsPage({ params }: PageProps) {
  const { locale } = await params;
  return <ForClinicsPageClient />;
}
