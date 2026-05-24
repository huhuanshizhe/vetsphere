import type { Metadata } from 'next';
import { generateContentListMetadata, renderContentListPage } from '@/lib/content-pages';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generateContentListMetadata(locale, 'specialty_hub');
}

export default async function SpecialtyHubListPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return renderContentListPage(locale, 'specialty_hub');
}