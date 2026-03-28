import { Metadata } from 'next';
import SettingsClient from './page.client';

export const metadata: Metadata = {
  title: 'Settings | VetSphere',
  description: 'Manage your account settings',
};

export default function SettingsPage() {
  return <SettingsClient />;
}