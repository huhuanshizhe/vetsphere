import type { Metadata } from 'next';
import JsonLd, { faqSchema, breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import HomePageClient from '@vetsphere/shared/pages/HomePageClient';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: 'VetSphere | 全球宠物医生专业教育与器械平台',
  description: 'VetSphere is the leading global platform for veterinary surgeons. Professional surgery courses (TPLO, IVDD, Soft Tissue), precision medical equipment, AI surgical consultation, and a vibrant clinical community.',
  keywords: ['veterinary surgery courses', 'CSAVS training', 'TPLO workshop', 'veterinary orthopedic equipment', 'vet continuing education', '兽医外科培训', '宠物医生课程'],
  alternates: {
    canonical: `${siteConfig.siteUrl}`,
    languages: Object.fromEntries(
      siteConfig.locales.map(l => [l === 'zh' ? 'zh-CN' : l, `${siteConfig.siteUrl}/${l}`])
    ),
  },
  openGraph: {
    title: 'VetSphere | Global Veterinary Surgery Education & Equipment',
    description: 'Professional surgery courses, precision medical equipment, AI consultation, and a global clinical community for veterinary surgeons.',
    url: siteConfig.siteUrl,
    siteName: siteConfig.siteName,
    type: 'website',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VetSphere | Global Veterinary Surgery Platform',
    description: 'Professional surgery courses, precision equipment, AI consultation for veterinary surgeons.',
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
        { name: 'Home', url: siteConfig.siteUrl },
      ])} />
      <HomePageClient />
    </>
  );
}
