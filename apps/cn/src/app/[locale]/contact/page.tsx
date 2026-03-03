import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import { ContactPage } from '@vetsphere/shared/pages/cn/ContactPage';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: '联系我们 | 宠医界',
  description: '联系宠医界团队，获取课程咨询、平台使用帮助或商务合作支持。',
  keywords: ['联系我们', '宠医界', '客服', '商务合作', '咨询'],
  openGraph: {
    title: '联系我们 | 宠医界',
    description: '联系宠医界团队，获取课程咨询、平台使用帮助或商务合作支持',
    url: `${siteConfig.siteUrl}/zh/contact`,
    siteName: '宠医界',
    type: 'website',
    locale: 'zh_CN',
  },
};

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ContactRoutePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: siteConfig.siteUrl },
        { name: '联系我们', url: `${siteConfig.siteUrl}/${locale}/contact` },
      ])} />
      <ContactPage locale={locale} />
    </>
  );
}
