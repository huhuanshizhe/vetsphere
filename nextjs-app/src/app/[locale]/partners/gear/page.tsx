import type { Metadata } from 'next';
import AuthPageClient from '../../auth/AuthPageClient';

export const metadata: Metadata = {
  title: 'Equipment Supplier Portal',
  robots: { index: false, follow: false },
};

export default function GearPartnerPage() {
  return <AuthPageClient portalType="ShopSupplier" />;
}
