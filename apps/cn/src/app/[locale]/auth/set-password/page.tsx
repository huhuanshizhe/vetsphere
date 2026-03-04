import { Metadata } from 'next';
import CnSetPasswordPage from '@vetsphere/shared/pages/cn/CnSetPasswordPage';

export const metadata: Metadata = {
  title: '设置密码 - VetSphere',
  description: '设置或重置您的 VetSphere 账户密码',
};

export default function SetPasswordPage() {
  return <CnSetPasswordPage />;
}
