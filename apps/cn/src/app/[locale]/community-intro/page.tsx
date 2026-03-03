import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import { CommunityIntroPage } from '@vetsphere/shared/pages/cn/CommunityIntroPage';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: '医生社区 | 宠医界',
  description: '围绕病例讨论、导师答疑、临床经验、职业成长与创业交流，建立一个真正服务宠物医生长期成长的专业社区。和同行一起成长，不再独自前行。',
  keywords: ['医生社区', '病例讨论', '导师答疑', '临床经验', '职业成长', '宠物医生交流'],
  openGraph: {
    title: '医生社区 | 宠医界',
    description: '和同行一起成长，不再独自前行。围绕病例讨论、导师答疑、临床经验的专业医生社区。',
    url: `${siteConfig.siteUrl}/zh/community-intro`,
    siteName: '宠医界',
    type: 'website',
    locale: 'zh_CN',
  },
};

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CommunityIntroRoutePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: siteConfig.siteUrl },
        { name: '医生社区', url: `${siteConfig.siteUrl}/${locale}/community-intro` },
      ])} />
      <CommunityIntroPage locale={locale} />
    </>
  );
}
