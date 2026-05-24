import type { Metadata } from 'next';
import { generateContentDetailMetadata, renderContentDetailPage } from '@/lib/content-pages';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return generateContentDetailMetadata(locale, 'procedure', slug);
}

export default async function ProcedureDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  return renderContentDetailPage(locale, 'procedure', slug);
}