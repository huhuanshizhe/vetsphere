import { Metadata } from 'next';
import WishlistPageClient from './page.client';

export async function generateMetadata() {
  return {
    title: 'My Wishlist | VetSphere',
    description: 'View and manage your favorite products',
  };
}

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <WishlistPageClient locale={locale} />;
}
