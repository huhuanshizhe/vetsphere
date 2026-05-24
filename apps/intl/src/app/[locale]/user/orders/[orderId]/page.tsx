import { Metadata } from 'next';
import OrderDetailClient from './page.client';
import { noIndexRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Order Details - VetSphere',
  description: 'View order details',
  robots: noIndexRobots,
};

interface PageProps {
  params: Promise<{
    locale: string;
    orderId: string;
  }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { locale, orderId } = await params;
  return <OrderDetailClient locale={locale} orderId={orderId} />;
}