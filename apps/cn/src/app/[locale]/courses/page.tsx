import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import CnCoursesPage from '@vetsphere/shared/pages/cn/CnCoursesPage';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: '课程中心 - 兽医专业培训课程',
  description: '专业兽医培训课程：外科手术、超声影像、眼科专科等实操训练。由资深专家授课，Wet-lab实操教学，小班精品授课。',
  keywords: ['兽医培训', '外科手术课程', '超声培训', 'TPLO手术', '兽医继续教育', '宠物医生培训'],
  openGraph: {
    title: '课程中心 - 兽医专业培训课程 | VetSphere',
    description: '专业兽医培训课程：外科手术、超声影像、眼科专科等实操训练。由资深专家授课。',
    url: `${siteConfig.siteUrl}/courses`,
    siteName: siteConfig.siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '课程中心 | VetSphere',
    description: '专业兽医培训课程，资深专家授课。',
  },
};

export default function CoursesPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: siteConfig.siteUrl },
        { name: '课程中心', url: `${siteConfig.siteUrl}/courses` },
      ])} />
      <CnCoursesPage />
    </>
  );
}
