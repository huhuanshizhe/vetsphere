import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import CnCourseCenterPage from '@vetsphere/shared/pages/cn/CnCourseCenterPage';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: '课程中心 - 宠物医生职业成长分层课程体系',
  description: '围绕宠物医生不同职业阶段，提供从考证入行、临床基础、专科进阶、高端实操到事业发展的分层课程体系。按阶段选课，按专科筛选，找到适合你的学习路径。',
  keywords: ['兽医培训', '宠物医生课程', '执业兽医考试', '临床基础', '专科进阶', '高端实操', '兽医继续教育', 'Wet-Lab', '外科培训', '超声培训'],
  openGraph: {
    title: '课程中心 - 宠物医生职业成长分层课程体系 | VetSphere',
    description: '围绕宠物医生不同职业阶段，提供考证入行、临床基础、专科进阶、高端实操、事业发展五大分层课程体系。',
    url: `${siteConfig.siteUrl}/courses`,
    siteName: siteConfig.siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '课程中心 | VetSphere',
    description: '宠物医生职业成长分层课程体系，按阶段选课，按专科筛选。',
  },
};

export default function CoursesPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: siteConfig.siteUrl },
        { name: '课程中心', url: `${siteConfig.siteUrl}/courses` },
      ])} />
      <CnCourseCenterPage />
    </>
  );
}
