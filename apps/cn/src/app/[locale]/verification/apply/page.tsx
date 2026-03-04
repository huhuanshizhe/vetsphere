import { Metadata } from 'next';
import CnVerificationApplyPage from '@vetsphere/shared/pages/cn/CnVerificationApplyPage';

export const metadata: Metadata = {
  title: '专业认证 - VetSphere',
  description: '提交专业认证申请，解锁更多功能',
};

export default function VerificationApplyPage() {
  return <CnVerificationApplyPage />;
}
