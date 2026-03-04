import { Metadata } from 'next';
import CnProfileCompletePage from '@vetsphere/shared/pages/cn/CnProfileCompletePage';

export const metadata: Metadata = {
  title: '完善资料 - VetSphere',
  description: '完善您的个人资料，开启专业成长之旅',
};

export default function ProfileCompletePage() {
  return <CnProfileCompletePage />;
}
