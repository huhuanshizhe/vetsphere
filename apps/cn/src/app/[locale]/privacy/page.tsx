import type { Metadata } from 'next';
import CnPrivacyPage from '@vetsphere/shared/pages/cn/CnPrivacyPage';

export const metadata: Metadata = {
  title: '隐私政策 - VetSphere',
  description: 'VetSphere 隐私政策 - 了解我们如何收集、使用和保护您的个人信息。',
  keywords: ['隐私政策', '数据保护', 'VetSphere'],
};

export default function PrivacyPage() {
  return <CnPrivacyPage />;
}
