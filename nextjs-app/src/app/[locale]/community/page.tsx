import { Metadata } from 'next';
import CommunityPageClient from './CommunityPageClient';

export const metadata: Metadata = {
  title: 'Community - VetSphere',
  description: 'Join the global veterinary surgical community. Share cases, learn from experts, and collaborate with fellow surgeons worldwide.',
};

export default function CommunityPage() {
  return <CommunityPageClient />;
}
