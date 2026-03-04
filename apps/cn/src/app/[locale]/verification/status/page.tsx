import { Metadata } from 'next';
import CnVerificationStatusPage from '@vetsphere/shared/pages/cn/CnVerificationStatusPage';

export const metadata: Metadata = {
  title: '认证状态 - VetSphere',
  description: '查看您的专业认证审核状态',
};

export default function VerificationStatusPage() {
  return <CnVerificationStatusPage />;
}
