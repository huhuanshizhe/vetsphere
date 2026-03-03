import type { Metadata } from 'next';
import CnAICenterPage from '@vetsphere/shared/pages/cn/CnAICenterPage';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: 'AI 智能助手 - 临床分析·学习助教·采购顾问·问诊助手',
  description: '专为宠物医生打造的 AI 能力中心，提供临床分析、学习助教、采购顾问、问诊助手四大核心能力。',
  keywords: ['兽医AI', 'AI临床助手', 'X光分析', '宠物医生AI', '学习助教', '采购顾问'],
  openGraph: {
    title: 'AI 智能助手 | VetSphere',
    description: '专为宠物医生打造的 AI 能力中心，提供临床分析、学习助教、采购顾问、问诊助手四大核心能力。',
    url: `${siteConfig.siteUrl}/ai`,
    siteName: siteConfig.siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 智能助手 | VetSphere',
    description: '专为宠物医生打造的 AI 能力中心。',
  },
};

export default function AIChatPage() {
  return <CnAICenterPage />;
}
