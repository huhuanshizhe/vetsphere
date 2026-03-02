import { Metadata } from 'next';
import DashboardPageClient from '@vetsphere/shared/pages/DashboardPageClient';

export const metadata: Metadata = {
  title: 'Dashboard - VetSphere',
  description: 'Manage your VetSphere account, orders, courses, and rewards. Access your personalized surgical education and equipment dashboard.',
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <DashboardPageClient />;
}
