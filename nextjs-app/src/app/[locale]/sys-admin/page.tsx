import type { Metadata } from 'next';
import AuthPageClient from '../auth/AuthPageClient';

export const metadata: Metadata = {
  title: 'System Admin Portal',
  robots: { index: false, follow: false },
};

export default function SysAdminPage() {
  return <AuthPageClient portalType="Admin" />;
}
