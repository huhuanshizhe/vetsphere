import type { Metadata } from 'next';
import { cache } from 'react';
import { permanentRedirect } from 'next/navigation';
import JsonLd, { breadcrumbSchema, productSchema } from '@vetsphere/shared/components/JsonLd';
import { buildProductDetailHref } from '@vetsphere/shared/lib/product-url';
import IntlProductDetailClient from '@vetsphere/shared/pages/intl/IntlProductDetailClient';
import {
  getIntlProductBySlug,
  getIntlProductCourses,
  getIntlProductImages,
  getIntlProductSkus,
  getIntlProductVariantAttributes,
  getIntlRelatedProducts,
  type IntlProduct,
} from '@vetsphere/shared/services/intl-api';
import { siteConfig } from '@/config/site.config';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

const getIntlProduct = cache(async (slugOrId: string, locale: string) => {
  return getIntlProductBySlug(slugOrId, locale);
});

function buildIntlProductPath(locale: string, product: Pick<IntlProduct, 'slug' | 'product_id'>) {
  return buildProductDetailHref(locale, {
    slug: product.slug,
    id: product.product_id,
  });
}

function buildIntlProductDescription(product: IntlProduct): string {
  const seoDescription = product.seo_description?.trim();
  if (seoDescription) return seoDescription;

  const description = [
    product.description,
    product.brand ? `Brand: ${product.brand}.` : '',
    product.specialty ? `Specialty: ${product.specialty}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return description || 'Training-compatible veterinary equipment with direct purchase and quote options.';
}

function resolveIntlProductPrice(product: IntlProduct): number | null {
  const candidates = [product.display_price, product.base_price, product.price_min, product.price_max];
  return (
    candidates.find((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0) ?? null
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const product = await getIntlProduct(id, locale);

  if (!product) {
    const fallbackUrl = `${siteConfig.siteUrl}/${locale}/shop/${id}`;
    return {
      title: 'Product Not Found',
      description: 'The product you requested could not be found or is no longer available.',
      alternates: {
        canonical: fallbackUrl,
      },
    };
  }

  const canonicalPath = buildIntlProductPath(locale, product);
  const productUrl = `${siteConfig.siteUrl}${canonicalPath}`;
  const title = product.seo_title?.trim() || product.display_name || product.base_name || 'Equipment';
  const description = buildIntlProductDescription(product).slice(0, 160);
  const imageUrl = product.cover_image_url || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: productUrl,
      type: 'website',
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                alt: title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    alternates: {
      canonical: productUrl,
      languages: Object.fromEntries(
        siteConfig.locales.map((l) => [l, `${siteConfig.siteUrl}${buildIntlProductPath(l, product)}`]),
      ),
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const product = await getIntlProduct(id, locale);
  const canonicalPath = product ? buildIntlProductPath(locale, product) : `/${locale}/shop/${id}`;

  if (product && canonicalPath !== `/${locale}/shop/${id}`) {
    permanentRedirect(canonicalPath);
  }

  const [images, relatedCourses, relatedProducts, skus, variantAttributes] = product
    ? await Promise.all([
        getIntlProductImages(product.product_id),
        getIntlProductCourses(product.product_id),
        getIntlRelatedProducts(product.product_id, product.scene_code),
        getIntlProductSkus(product.product_id),
        getIntlProductVariantAttributes(product.product_id),
      ])
    : [[], [], [], [], []];

  const productName = product?.display_name || product?.base_name || 'Product Details';
  const productPrice = product ? resolveIntlProductPrice(product) : null;
  const stockStatus = product?.stock_quantity && product.stock_quantity > 0 ? 'In Stock' : 'OutOfStock';

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: `${siteConfig.siteUrl}/${locale}` },
        { name: 'Equipment', url: `${siteConfig.siteUrl}/${locale}/shop` },
        { name: productName, url: `${siteConfig.siteUrl}${canonicalPath}` },
      ])} />

      {product && productPrice !== null && product.cover_image_url ? (
        <JsonLd data={productSchema(siteConfig, {
          name: productName,
          description: buildIntlProductDescription(product),
          price: productPrice,
          imageUrl: product.cover_image_url,
          brand: product.brand || siteConfig.siteName,
          stockStatus,
          url: `${siteConfig.siteUrl}${canonicalPath}`,
        })} />
      ) : null}

      <IntlProductDetailClient
        productSlug={product?.slug || id}
        initialData={{
          locale,
          productSlug: product?.slug || id,
          product,
          images,
          relatedCourses,
          relatedProducts,
          skus,
          variantAttributes,
        }}
      />
    </>
  );
}
