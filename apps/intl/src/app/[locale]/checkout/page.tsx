import { Metadata } from 'next';
import CheckoutClient from './page.client';
import { noIndexRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Checkout - VetSphere',
  description: 'Complete your order securely',
  robots: noIndexRobots,
};

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function CheckoutPage({ params }: PageProps) {
  const { locale } = await params;
  return <CheckoutClient locale={locale} />;
}