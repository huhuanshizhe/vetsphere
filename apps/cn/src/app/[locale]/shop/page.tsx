import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import CnShopPageClient from '@vetsphere/shared/pages/cn/CnShopPageClient';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: '临床器械与耗材 | 临床配套中心 | 宠医界',
  description: '围绕宠物医生的临床接诊、专科训练、设备升级与诊所准备需求，提供专业配套采购支持。课程同款器械、高频补货、基础诊疗工具、专科器械、设备升级、开业方案。',
  keywords: ['兽医器械', '临床配套', '课程同款', '宠物医疗设备', '诊所设备', '骨科器械', '手术器械', '医疗耗材'],
  openGraph: {
    title: '临床器械与耗材 | 临床配套中心 | 宠医界',
    description: '围绕宠物医生的临床场景，提供专业配套采购支持。',
    url: `${siteConfig.siteUrl}/shop`,
    siteName: siteConfig.siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '临床器械与耗材 | 宠医界',
    description: '临床配套采购中心，课程同款器械，专业设备升级。',
  },
};

export default function ShopPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: siteConfig.siteUrl },
        { name: '临床器械与耗材', url: `${siteConfig.siteUrl}/shop` },
      ])} />
      <CnShopPageClient />
    </>
  );
}
