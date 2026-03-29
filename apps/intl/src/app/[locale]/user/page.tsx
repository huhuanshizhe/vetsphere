import { Metadata } from 'next';
import UserCenterClient from '@vetsphere/shared/pages/UserCenterClient';

export const metadata: Metadata = {
  title: 'My Account - VetSphere',
  description: 'Manage your VetSphere account',
};

/**
 * 用户中心页面
 * 所有登录用户均可访问，管理课程、订单、积分等
 */
export default function UserCenterPage() {
  return <UserCenterClient />;
}