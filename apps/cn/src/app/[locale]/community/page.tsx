import { Metadata } from 'next';
import CommunityPageClient from '@vetsphere/shared/pages/CommunityPageClient';
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  title: 'Community - VetSphere',
  description: 'Join the global veterinary surgical community. Share cases, learn from experts, and collaborate with fellow surgeons worldwide.',
  keywords: ['veterinary community', 'clinical case sharing', 'surgery discussion', 'vet collaboration'],
  openGraph: {
    title: 'Veterinary Surgery Community | VetSphere',
    description: 'Join the global veterinary surgical community. Share clinical cases, learn from experts, and collaborate with fellow surgeons.',
    url: `${siteConfig.siteUrl}/community`,
    siteName: siteConfig.siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Veterinary Surgery Community | VetSphere',
    description: 'Share clinical cases and collaborate with veterinary surgeons worldwide.',
  },
};

export default function CommunityPage() {
  return <CommunityPageClient />;
}
