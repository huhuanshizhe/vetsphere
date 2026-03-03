import type { Metadata } from 'next';
import CnTermsPage from '@vetsphere/shared/pages/cn/CnTermsPage';

export const metadata: Metadata = {
  title: '用户协议 - VetSphere',
  description: 'VetSphere 用户协议 - 阅读使用 VetSphere 平台的服务条款和条件。',
  keywords: ['用户协议', '服务条款', 'VetSphere'],
};

export default function TermsPage() {
  return <CnTermsPage />;
}
