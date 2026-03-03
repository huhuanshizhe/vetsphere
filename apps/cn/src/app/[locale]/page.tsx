import type { Metadata } from 'next';
import JsonLd, { faqSchema, breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import CnHomePageClient from '@vetsphere/shared/pages/cn/CnHomePageClient';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: '宠医界 | 宠物医生职业成长与客户经营平台',
  description: '宠医界为中国小动物兽医提供专业进阶、职业发展、创业支持与客户经营工具。从学习到临床，从职业到创业，构建你的长期竞争力。',
  keywords: ['宠物医生', '兽医职业发展', '宠物医疗创业', '兽医培训', '临床工具', '宠医界', '宠物医生成长', '兽医课程'],
  alternates: {
    canonical: `${siteConfig.siteUrl}`,
    languages: Object.fromEntries(
      siteConfig.locales.map(l => [l === 'zh' ? 'zh-CN' : l, `${siteConfig.siteUrl}/${l}`])
    ),
  },
  openGraph: {
    title: '宠医界 | 宠物医生职业成长与客户经营平台',
    description: '围绕临床进阶、职业发展、创业支持与客户经营，为中国宠物医生提供长期、持续的事业发展平台。',
    url: siteConfig.siteUrl,
    siteName: '宠医界',
    type: 'website',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: '宠医界 | 宠物医生职业成长与客户经营平台',
    description: '为中国宠物医生提供专业进阶、职业发展、创业支持与客户经营工具。',
  },
};

const homeFaqs = [
  {
    question: '宠医界是什么？',
    answer: '宠医界是围绕宠物医生职业全生命周期的一站式事业发展平台，提供专业课程、临床工具、职业发展和创业支持服务。',
  },
  {
    question: '宠医界提供哪些课程？',
    answer: '平台提供骨科、神经外科、软组织外科等专科进阶课程，由ACVS/ECVS认证的资深导师授课，包含理论学习和实操培训。',
  },
  {
    question: '宠医界的临床工具有哪些？',
    answer: '平台提供电子病历管理、宠物与客户档案、家庭医生式问诊和健康服务推荐等临床工具，帮助医生提升日常诊疗效率。',
  },
  {
    question: '宠医界如何支持医生创业？',
    answer: '平台提供新型宠物健康管理中心模型、创业工具包、服务项目设计和客户经营支持，帮助医生从临床走向事业发展。',
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqSchema(homeFaqs)} />
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: siteConfig.siteUrl },
      ])} />
      <CnHomePageClient />
    </>
  );
}
