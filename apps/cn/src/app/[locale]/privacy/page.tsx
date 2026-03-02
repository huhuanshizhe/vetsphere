import type { Metadata } from 'next';
import PrivacyPageClient from '@vetsphere/shared/pages/PrivacyPageClient';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'VetSphere Privacy Policy - Learn how we collect, use, and protect your personal information.',
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
