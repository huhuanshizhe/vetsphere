import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import { ClinicalWorkflowPage } from '@vetsphere/shared/pages/cn/ClinicalWorkflowPage';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: '临床工具 | 宠医界',
  description: '从客户管理、电子病历到在线问诊与随访，宠医界帮助宠物医生把专业成长真正转化为日常工作效率与长期服务能力。',
  keywords: ['临床工具', '电子病历', '客户管理', '在线问诊', '宠物医生工作台', '随访管理'],
  openGraph: {
    title: '临床工具 | 宠医界',
    description: '把学习真正延续到你的临床工作中。围绕医生真实工作场景的四大核心工具。',
    url: `${siteConfig.siteUrl}/zh/clinical-tools`,
    siteName: '宠医界',
    type: 'website',
    locale: 'zh_CN',
  },
};

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ClinicalToolsRoutePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: siteConfig.siteUrl },
        { name: '临床工具', url: `${siteConfig.siteUrl}/${locale}/clinical-tools` },
      ])} />
      <ClinicalWorkflowPage locale={locale} />
    </>
  );
}
