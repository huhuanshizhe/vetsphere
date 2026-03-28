import { Metadata } from 'next';
import UserCenterClient from './page.client';

export const metadata: Metadata = {
  title: 'My Account - VetSphere',
  description: 'Manage your VetSphere account',
};

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function UserCenterPage({ params }: PageProps) {
  const { locale } = await params;
  return <UserCenterClient locale={locale} />;
}