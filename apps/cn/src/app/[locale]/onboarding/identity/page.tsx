import { Metadata } from 'next';
import CnIdentitySelectPage from '@vetsphere/shared/pages/cn/CnIdentitySelectPage';

export const metadata: Metadata = {
  title: '选择身份 - VetSphere',
  description: '选择您的职业身份，获取专属服务',
};

export default function IdentitySelectPage() {
  return <CnIdentitySelectPage />;
}
