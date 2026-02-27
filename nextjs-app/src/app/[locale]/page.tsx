import type { Metadata } from 'next';
import JsonLd, { faqSchema, breadcrumbSchema } from '@/components/JsonLd';
import HomePageClient from './HomePageClient';

export const metadata: Metadata = {
  title: 'VetSphere | \u5168\u7403\u5BA0\u7269\u533B\u751F\u4E13\u4E1A\u6559\u80B2\u4E0E\u5668\u68B0\u5E73\u53F0',
  description: 'VetSphere is the leading global platform for veterinary surgeons. Professional surgery courses (TPLO, IVDD, Soft Tissue), precision medical equipment, AI surgical consultation, and a vibrant clinical community.',
  keywords: ['veterinary surgery courses', 'CSAVS training', 'TPLO workshop', 'veterinary orthopedic equipment', 'vet continuing education', '\u517D\u533B\u5916\u79D1\u57F9\u8BAD', '\u5BA0\u7269\u533B\u751F\u8BFE\u7A0B'],
  alternates: {
    canonical: 'https://vetsphere.com',
    languages: {
      'en': 'https://vetsphere.com?lang=en',
      'zh-CN': 'https://vetsphere.com?lang=zh',
      'th': 'https://vetsphere.com?lang=th',
    },
  },
};

const homeFaqs = [
  {
    question: 'What is VetSphere?',
    answer: 'VetSphere is a global professional development platform for veterinary surgeons, offering hands-on surgery courses (Orthopedics, Neurosurgery, Soft Tissue), precision medical equipment, AI-powered surgical consultation, and a clinical case-sharing community.',
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
  {
    question: 'What is the VetSphere AI Surgical Consultant?',
    answer: 'The VetSphere AI is a 24/7 surgical consultation tool powered by advanced AI. It can analyze X-rays and CT scans, provide surgical planning assistance, recommend equipment, and support English, Chinese, and Thai languages.',
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqSchema(homeFaqs)} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://vetsphere.com' },
      ])} />
      <HomePageClient />
    </>
  );
}
