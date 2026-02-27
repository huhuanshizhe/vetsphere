import type { Metadata } from 'next';
import AdminDashboardClient from './AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Admin Dashboard - VetSphere',
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
