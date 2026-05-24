import { Metadata } from 'next';
import SettingsClient from './page.client';
import { noIndexRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Settings | VetSphere',
  description: 'Manage your account settings',
  robots: noIndexRobots,
};

export default function SettingsPage() {
  return <SettingsClient />;
}