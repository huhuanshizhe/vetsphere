import { Metadata } from 'next';
import WishlistPageClient from './page.client';

export async function generateMetadata() {
  return {
    title: 'My Wishlist | VetSphere',
    description: 'View and manage your favorite products',
  };
}

export default function WishlistPage({ params: { locale } }: { params: { locale: string } }) {
  return <WishlistPageClient locale={locale} />;
}
