import type { Metadata } from 'next';
import TermsPageClient from './TermsPageClient';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'VetSphere Terms of Service - Read the terms and conditions for using VetSphere platform.',
};

export default function TermsPage() {
  return <TermsPageClient />;
}
