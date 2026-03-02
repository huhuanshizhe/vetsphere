import type { Metadata } from 'next';
import JsonLd, { faqSchema, breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import IntlUpgradeHomePageClient from '@vetsphere/shared/pages/intl/IntlUpgradeHomePageClient';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: 'VetSphere | Global Veterinary Surgery Education & Equipment',
  description: 'VetSphere is the leading global platform for veterinary surgeons. Professional surgery courses (TPLO, IVDD, Soft Tissue), precision medical equipment, and hands-on training worldwide.',
  keywords: ['veterinary surgery courses', 'CSAVS training', 'TPLO workshop', 'veterinary orthopedic equipment', 'vet continuing education', 'veterinary surgical instruments', 'veterinary training programs'],
  alternates: {
    canonical: `${siteConfig.siteUrl}`,
    languages: Object.fromEntries(
      siteConfig.locales.map(l => [l, `${siteConfig.siteUrl}/${l}`])
    ),
  },
  openGraph: {
    title: 'VetSphere | Global Veterinary Surgery Education & Equipment',
    description: 'Professional surgery courses, precision medical equipment, and a global clinical community for veterinary surgeons.',
    url: siteConfig.siteUrl,
    siteName: siteConfig.siteName,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VetSphere | Global Veterinary Surgery Platform',
    description: 'Professional surgery courses, precision equipment for veterinary surgeons worldwide.',
  },
};

const homeFaqs = [
  {
    question: 'What is VetSphere?',
    answer: 'VetSphere is a global professional development platform for veterinary surgeons, offering hands-on surgery courses (Orthopedics, Neurosurgery, Soft Tissue), precision medical equipment, and a clinical case-sharing community.',
  },
  {
    question: 'What courses does VetSphere offer?',
    answer: 'VetSphere offers professional veterinary surgery workshops including TPLO training, joint surgery, soft tissue surgery, ophthalmology certification (VOSC), and abdominal ultrasound courses. All courses are taught by board-certified diplomates (ACVS/ECVS/DECVS).',
  },
  {
    question: 'Who are the instructors at VetSphere?',
    answer: 'Our faculty consists of 50+ board-certified veterinary surgeons from world-leading institutions including University of Florida, Royal Veterinary College (UK), UC Davis, Cornell University, and University of Zurich.',
  },
  {
    question: 'Does VetSphere ship surgical equipment internationally?',
    answer: 'Yes. VetSphere provides ISO 13485 certified surgical instruments and implants with global shipping to over 35 countries. We offer TPLO saw systems, titanium locking plates, micro-ophthalmic instruments, and more.',
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqSchema(homeFaqs)} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: siteConfig.siteUrl },
      ])} />
      <IntlUpgradeHomePageClient />
    </>
  );
}
