import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import IntlProductDetailClient from '@vetsphere/shared/pages/intl/IntlProductDetailClient';
import { siteConfig } from '@/config/site.config';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const productUrl = `${siteConfig.siteUrl}/${locale}/shop/${id}`;

  return {
    title: `Equipment | VetSphere`,
    description: 'Training-compatible veterinary equipment with direct purchase and quote options.',
    openGraph: {
      title: 'Equipment | VetSphere',
      url: productUrl,
      type: 'website',
    },
    alternates: {
      canonical: productUrl,
      languages: Object.fromEntries(
        siteConfig.locales.map((l: string) => [l, `${siteConfig.siteUrl}/${l}/shop/${id}`])
      ),
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { locale, id } = await params;

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: `${siteConfig.siteUrl}/${locale}` },
        { name: 'Equipment', url: `${siteConfig.siteUrl}/${locale}/shop` },
        { name: 'Product Details', url: `${siteConfig.siteUrl}/${locale}/shop/${id}` },
      ])} />
      <IntlProductDetailClient productSlug={id} />
    </>
  );
}
