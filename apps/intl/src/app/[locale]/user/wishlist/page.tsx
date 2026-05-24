import { Metadata } from 'next';
import WishlistPageClient from './page.client';
import { noIndexRobots } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'My Wishlist | VetSphere',
    description: 'View and manage your favorite products',
    robots: noIndexRobots,
  };
}

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <WishlistPageClient locale={locale} />;
}
