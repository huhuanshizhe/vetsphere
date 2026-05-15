import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import JsonLd, { productSchema, breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import CnProductDetailClient from '@vetsphere/shared/pages/cn/CnProductDetailClient';
import { api } from '@vetsphere/shared/services/api';
import { buildProductDetailHref } from '@vetsphere/shared/lib/product-url';
import { siteConfig } from '@/config/site.config';

interface PageProps {
  params: Promise<{ locale: string; categorySlug: string; slug: string }>;
}

async function getProductBySeoPath(categorySlug: string, slug: string) {
  return api.getProductBySeoPath(categorySlug, slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, categorySlug, slug } = await params;
  const product = await getProductBySeoPath(categorySlug, slug);

  if (!product) {
    return {
      title: '商品未找到 | 临床器械与耗材 | 宠医界',
      description: '您访问的商品不存在或已下架',
    };
  }

  const productPath = buildProductDetailHref(locale, product);
  const productUrl = `${siteConfig.siteUrl}${productPath}`;
  const title = product.name;
  const description = `${product.description} 品牌：${product.brand}。`;

  return {
    title: `${title} | 临床器械与耗材 | 宠医界`,
    description: `${description} ${product.longDescription || ''}`.slice(0, 160),
    keywords: [
      product.name,
      product.brand,
      product.categorySlug || categorySlug,
      '兽医器械',
      '宠物医疗设备',
      '临床器械',
      '宠医界',
    ],
    openGraph: {
      title: `${title} | 宠医界`,
      description,
      url: productUrl,
      type: 'website',
      images: [
        {
          url: product.imageUrl,
          width: 600,
          height: 600,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | 宠医界`,
      description,
      images: [product.imageUrl],
    },
    alternates: {
      canonical: productUrl,
      languages: Object.fromEntries(
        siteConfig.locales.map((l) => [l === 'zh' ? 'zh-CN' : l, `${siteConfig.siteUrl}${buildProductDetailHref(l, product)}`]),
      ),
    },
  };
}

export default async function ProductDetailSeoPage({ params }: PageProps) {
  const { locale, categorySlug, slug } = await params;
  const product = await getProductBySeoPath(categorySlug, slug);

  if (!product) {
    notFound();
  }

  const canonicalPath = buildProductDetailHref(locale, product);
  const currentPath = `/${locale}/shop/${categorySlug}/${slug}`;

  if (canonicalPath !== currentPath) {
    permanentRedirect(canonicalPath);
  }

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: `${siteConfig.siteUrl}/${locale}` },
        { name: '临床器械与耗材', url: `${siteConfig.siteUrl}/${locale}/shop` },
        { name: product.name, url: `${siteConfig.siteUrl}${canonicalPath}` },
      ])} />

      <JsonLd data={productSchema(siteConfig, {
        name: product.name,
        description: product.longDescription || product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        brand: product.brand,
        stockStatus: product.stockStatus,
        url: `${siteConfig.siteUrl}${canonicalPath}`,
      })} />

      <CnProductDetailClient productId={product.id} />
    </>
  );
}