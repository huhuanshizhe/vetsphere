import { Metadata } from 'next';
import CheckoutPageClient from '@vetsphere/shared/pages/CheckoutPageClient';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: 'Checkout - VetSphere',
  description: 'Complete your purchase securely. Shop surgical equipment, course enrollments, and professional resources for veterinary surgeons.',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutPageClient siteConfig={siteConfig} />;
}
