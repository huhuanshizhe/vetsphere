import { Metadata } from 'next';
import CnAuthPage from '@vetsphere/shared/pages/cn/CnAuthPage';

export const metadata: Metadata = {
  title: '登录 / 注册 - VetSphere',
  description: '登录或注册 VetSphere 账户，开启您的职业成长之旅。加入数千名兽医同行，获取专业培训、职业机会和社区支持。',
  keywords: ['VetSphere登录', '兽医注册', '宠物医生账户'],
};

export default function AuthPage() {
  return <CnAuthPage />;
}
