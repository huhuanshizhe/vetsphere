import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import { CooperationPage } from '@vetsphere/shared/pages/cn/CooperationPage';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: '合作咨询 | 宠医界',
  description: '与宠医界合作，共同服务宠物医生成长。培训合作、医院合作、器械与产品合作、内容与社区合作。',
  keywords: ['合作咨询', '宠医界', '商务合作', '培训合作', '医院合作'],
  openGraph: {
    title: '合作咨询 | 宠医界',
    description: '与宠医界携手，共同服务宠物医生成长',
    url: `${siteConfig.siteUrl}/zh/cooperation`,
    siteName: '宠医界',
    type: 'website',
    locale: 'zh_CN',
  },
};

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CooperationRoutePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: siteConfig.siteUrl },
        { name: '合作咨询', url: `${siteConfig.siteUrl}/${locale}/cooperation` },
      ])} />
      <CooperationPage locale={locale} />
    </>
  );
}
