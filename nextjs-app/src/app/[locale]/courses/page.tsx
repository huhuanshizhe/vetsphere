import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@/components/JsonLd';
import CoursesPageClient from './CoursesPageClient';

export const metadata: Metadata = {
  title: 'Veterinary Surgery Courses & Wet-Lab Training',
  description: 'Professional veterinary surgery workshops: TPLO, Joint Surgery, Soft Tissue, Ophthalmology (VOSC), and Ultrasound. Taught by ACVS/ECVS board-certified diplomates at locations across China.',
  keywords: ['veterinary surgery courses', 'TPLO training', 'wet-lab workshop', 'CSAVS', 'veterinary continuing education'],
};

export default function CoursesPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://vetsphere.com' },
        { name: 'Courses', url: 'https://vetsphere.com/courses' },
      ])} />
      <CoursesPageClient />
    </>
  );
}
