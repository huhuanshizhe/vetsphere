import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import { AboutPage } from '@vetsphere/shared/pages/cn/AboutPage';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: '关于我们 | 宠医界',
  description: '宠医界是围绕宠物医生职业全生命周期的一站式事业发展平台，提供专业培训、临床工具、成长管理、职业发展与创业支持服务。',
  keywords: ['宠医界', '关于我们', '宠物医生平台', '兽医培训', '职业发展'],
  openGraph: {
    title: '关于我们 | 宠医界',
    description: '围绕宠物医生职业全生命周期的一站式事业发展平台',
    url: `${siteConfig.siteUrl}/zh/about`,
    siteName: '宠医界',
    type: 'website',
    locale: 'zh_CN',
  },
};

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AboutRoutePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: siteConfig.siteUrl },
        { name: '关于我们', url: `${siteConfig.siteUrl}/${locale}/about` },
      ])} />
      <AboutPage locale={locale} />
    </>
  );
}
