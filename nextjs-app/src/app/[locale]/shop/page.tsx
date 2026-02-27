import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@/components/JsonLd';
import ShopPageClient from './ShopPageClient';

export const metadata: Metadata = {
  title: 'Veterinary Surgical Equipment & Instruments',
  description: 'ISO 13485 certified veterinary surgical equipment: TPLO saw systems, titanium locking plates, micro-ophthalmic instruments, and consumables. Global shipping to 35+ countries.',
  keywords: ['veterinary equipment', 'TPLO saw', 'titanium locking plate', 'surgical instruments', 'veterinary implants'],
};

export default function ShopPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://vetsphere.com' },
        { name: 'Equipment Shop', url: 'https://vetsphere.com/shop' },
      ])} />
      <ShopPageClient />
    </>
  );
}
