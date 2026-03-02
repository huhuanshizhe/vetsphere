import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import ShopPageClient from '@vetsphere/shared/pages/ShopPageClient';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: 'Veterinary Surgical Equipment & Instruments',
  description: 'ISO 13485 certified veterinary surgical equipment: TPLO saw systems, titanium locking plates, micro-ophthalmic instruments, and consumables. Global shipping to 35+ countries.',
  keywords: ['veterinary equipment', 'TPLO saw', 'titanium locking plate', 'surgical instruments', 'veterinary implants'],
  openGraph: {
    title: 'Veterinary Surgical Equipment & Instruments | VetSphere',
    description: 'ISO 13485 certified veterinary surgical equipment: TPLO saws, titanium locking plates, micro-ophthalmic instruments. Global shipping to 35+ countries.',
    url: `${siteConfig.siteUrl}/shop`,
    siteName: siteConfig.siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Veterinary Surgical Equipment | VetSphere',
    description: 'ISO 13485 certified surgical equipment and instruments for veterinary surgeons.',
  },
};

export default function ShopPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: siteConfig.siteUrl },
        { name: 'Equipment Shop', url: `${siteConfig.siteUrl}/shop` },
      ])} />
      <ShopPageClient />
    </>
  );
}
