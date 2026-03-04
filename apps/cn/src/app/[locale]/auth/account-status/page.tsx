import { Metadata } from 'next';
import CnAccountStatusPage from '@vetsphere/shared/pages/cn/CnAccountStatusPage';

export const metadata: Metadata = {
  title: '账号状态 - VetSphere',
  description: '您的账号状态信息',
};

export default function AccountStatusPage() {
  return <CnAccountStatusPage />;
}
