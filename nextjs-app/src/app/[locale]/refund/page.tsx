import type { Metadata } from 'next';
import RefundPageClient from './RefundPageClient';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'VetSphere Refund Policy - Learn about our refund and cancellation policies for courses and equipment.',
};

export default function RefundPage() {
  return <RefundPageClient />;
}
