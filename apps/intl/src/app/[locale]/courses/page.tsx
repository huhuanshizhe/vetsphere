import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import CoursesPageClient from '@vetsphere/shared/pages/CoursesPageClient';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: 'Veterinary Surgery Courses & Wet-Lab Training',
  description: 'Professional veterinary surgery workshops: TPLO, Joint Surgery, Soft Tissue, Ophthalmology (VOSC), and Ultrasound. Taught by ACVS/ECVS board-certified diplomates at locations across China.',
  keywords: ['veterinary surgery courses', 'TPLO training', 'wet-lab workshop', 'CSAVS', 'veterinary continuing education'],
  openGraph: {
    title: 'Veterinary Surgery Courses & Wet-Lab Training | VetSphere',
    description: 'Professional veterinary surgery workshops: TPLO, Joint Surgery, Soft Tissue, Ophthalmology, and Ultrasound. Taught by ACVS/ECVS board-certified diplomates.',
    url: `${siteConfig.siteUrl}/courses`,
    siteName: siteConfig.siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Veterinary Surgery Courses | VetSphere',
    description: 'Professional veterinary surgery workshops taught by board-certified diplomates.',
  },
};

export default function CoursesPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: siteConfig.siteUrl },
        { name: 'Courses', url: `${siteConfig.siteUrl}/courses` },
      ])} />
      <CoursesPageClient />
    </>
  );
}
