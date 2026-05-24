import type { Metadata } from 'next';
import { generateContentDetailMetadata, renderContentDetailPage } from '@/lib/content-pages';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return generateContentDetailMetadata(locale, 'faq_hub', slug);
}

export default async function FaqHubDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  return renderContentDetailPage(locale, 'faq_hub', slug);
}