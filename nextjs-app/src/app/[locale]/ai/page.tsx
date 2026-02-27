import type { Metadata } from 'next';
import AIChatPageClient from './AIChatPageClient';

export const metadata: Metadata = {
  title: 'AI Surgical Consultant',
  description: '24/7 AI-powered veterinary surgical consultation. Analyze X-rays, CT scans, and get expert surgical planning assistance. Supports English, Chinese, and Thai.',
  keywords: ['veterinary AI', 'surgical AI consultant', 'X-ray analysis', 'veterinary diagnosis AI'],
};

export default function AIChatPage() {
  return <AIChatPageClient />;
}
