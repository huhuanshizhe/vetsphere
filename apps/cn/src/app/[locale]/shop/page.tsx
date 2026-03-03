import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import ShopPageClient from '@vetsphere/shared/pages/ShopPageClient';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: '器械商城 - 专业兽医手术器械与设备',
  description: '专业兽医手术器械商城：骨科器械、软组织手术器械、眼科设备、超声诊断设备等。配合课程学习，提升临床实践能力。',
  keywords: ['兽医器械', '手术器械', '骨科器械', 'TPLO器械', '兽医设备', '宠物医疗设备'],
  openGraph: {
    title: '器械商城 - 专业兽医手术器械与设备 | VetSphere',
    description: '专业兽医手术器械商城：骨科器械、软组织手术器械、眼科设备等。',
    url: `${siteConfig.siteUrl}/shop`,
    siteName: siteConfig.siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '器械商城 | VetSphere',
    description: '专业兽医手术器械与设备商城。',
  },
};

export default function ShopPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: siteConfig.siteUrl },
        { name: '器械商城', url: `${siteConfig.siteUrl}/shop` },
      ])} />
      <ShopPageClient />
    </>
  );
}
