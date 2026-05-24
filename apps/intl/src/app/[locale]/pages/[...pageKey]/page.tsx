import type { Metadata } from 'next';
import { generateCmsPageMetadata, renderCmsPage } from '@/lib/cms-pages';

interface CmsPageRouteProps {
  params: Promise<{ locale: string; pageKey: string[] }>;
}

export async function generateMetadata({ params }: CmsPageRouteProps): Promise<Metadata> {
  const { locale, pageKey } = await params;
  return generateCmsPageMetadata(locale, pageKey);
}

export default async function IntlCmsPageRoute({ params }: CmsPageRouteProps) {
  const { locale, pageKey } = await params;
  return renderCmsPage(locale, pageKey);
}
