import { Metadata } from 'next';
import OrdersClient from './page.client';

export const metadata: Metadata = {
  title: 'My Orders - VetSphere',
  description: 'View and manage your orders',
};

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
}

export default async function OrdersPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { status, page } = await searchParams;
  return <OrdersClient locale={locale} initialStatus={status} initialPage={page} />;
}