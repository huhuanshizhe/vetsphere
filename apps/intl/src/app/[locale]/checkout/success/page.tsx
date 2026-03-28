import { Metadata } from 'next';
import SuccessClient from './page.client';

export const metadata: Metadata = {
  title: 'Payment Successful - VetSphere',
  description: 'Your payment has been processed successfully',
};

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    orderId?: string;
    success?: string;
  }>;
}

export default async function CheckoutSuccessPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { orderId, success } = await searchParams;
  return <SuccessClient locale={locale} orderId={orderId} success={success} />;
}