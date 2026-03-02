import type { Metadata } from 'next';
import AIChatPageClient from '@vetsphere/shared/pages/AIChatPageClient';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: 'AI Surgical Consultant',
  description: '24/7 AI-powered veterinary surgical consultation. Analyze X-rays, CT scans, and get expert surgical planning assistance. Supports English, Chinese, and Thai.',
  keywords: ['veterinary AI', 'surgical AI consultant', 'X-ray analysis', 'veterinary diagnosis AI'],
  openGraph: {
    title: 'AI Surgical Consultant | VetSphere',
    description: '24/7 AI-powered veterinary surgical consultation. Analyze X-rays, CT scans, and get expert surgical planning assistance.',
    url: `${siteConfig.siteUrl}/ai`,
    siteName: siteConfig.siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Surgical Consultant | VetSphere',
    description: '24/7 AI-powered veterinary surgical consultation and X-ray analysis.',
  },
};

export default function AIChatPage() {
  return <AIChatPageClient />;
}
