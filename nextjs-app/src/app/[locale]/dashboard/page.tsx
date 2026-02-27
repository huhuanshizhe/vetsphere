import { Metadata } from 'next';
import DashboardPageClient from './DashboardPageClient';

export const metadata: Metadata = {
  title: 'Dashboard - VetSphere',
  description: 'Manage your VetSphere account, orders, courses, and rewards. Access your personalized surgical education and equipment dashboard.',
};

export default function DashboardPage() {
  return <DashboardPageClient />;
}
