import type { Metadata } from 'next';
import AuthPageClient from '../../auth/AuthPageClient';

export const metadata: Metadata = {
  title: 'Education Partner Portal',
  robots: { index: false, follow: false },
};

export default function EduPartnerPage() {
  return <AuthPageClient portalType="CourseProvider" />;
}
