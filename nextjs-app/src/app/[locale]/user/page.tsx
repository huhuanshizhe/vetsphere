import type { Metadata } from 'next';
import UserCenterClient from './UserCenterClient';

export const metadata: Metadata = {
  title: 'User Center | VetSphere',
  description: 'Manage your profile, orders, and enrolled courses',
};

export default function UserCenterPage() {
  return <UserCenterClient />;
}
