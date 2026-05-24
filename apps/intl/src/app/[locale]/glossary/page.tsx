import type { Metadata } from 'next';
import { generateContentListMetadata, renderContentListPage } from '@/lib/content-pages';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generateContentListMetadata(locale, 'glossary_term');
}

export default async function GlossaryListPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return renderContentListPage(locale, 'glossary_term');
}