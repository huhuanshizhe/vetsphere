import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd, { productSchema, breadcrumbSchema } from '@/components/JsonLd';
import ProductDetailClient from './ProductDetailClient';
import { PRODUCTS_CN } from '@/lib/constants';
import { Product } from '@/types';
import { supabase } from '@/services/supabase';

const SITE_URL = 'https://vetsphere.com';
const locales = ['en', 'zh', 'th'] as const;
type Locale = (typeof locales)[number];

// Get product data by ID - tries DB first, falls back to constants
async function getProductById(id: string): Promise<Product | undefined> {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (!error && data) {
      const p = data as any;
      return {
        id: p.id, name: p.name, brand: p.brand, price: p.price, specialty: p.specialty,
        group: p.group_category, imageUrl: p.image_url, description: p.description,
        longDescription: p.long_description || p.description,
        specs: p.specs || {}, compareData: p.compare_data,
        stockStatus: p.stock_status || 'In Stock',
        supplier: p.supplier_info || { name: 'Verified Supplier', origin: 'Global', rating: 5.0 }
      } as Product;
    }
  } catch {}
  return PRODUCTS_CN.find(p => p.id === id);
}

// Generate static params for all products
export async function generateStaticParams() {
  const params: { locale: string; id: string }[] = [];
  
  try {
    const { data } = await supabase.from('products').select('id');
    if (data && data.length > 0) {
      for (const locale of locales) {
        for (const row of data) {
          params.push({ locale, id: (row as any).id });
        }
      }
      return params;
    }
  } catch {}

  for (const locale of locales) {
    for (const product of PRODUCTS_CN) {
      params.push({ locale, id: product.id });
    }
  }
  
  return params;
}

// Dynamic metadata for SEO
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string; id: string }> 
}): Promise<Metadata> {
  const { locale, id } = await params;
  const product = await getProductById(id);
  
  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.',
    };
  }

  const productUrl = `${SITE_URL}/${locale}/shop/${id}`;
  const title = product.name;
  const description = `${product.description} Brand: ${product.brand}. ${product.stockStatus}.`;

  return {
    title: `${title} | VetSphere Equipment`,
    description: `${description} ${product.longDescription}`,
    keywords: [
      product.name,
      product.brand,
      product.specialty,
      product.group,
      'veterinary equipment',
      'surgical instruments',
    ],
    openGraph: {
      title,
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
      title,
      description,
      images: [product.imageUrl],
    },
    alternates: {
      canonical: productUrl,
      languages: {
        'en': `${SITE_URL}/en/shop/${id}`,
        'zh-CN': `${SITE_URL}/zh/shop/${id}`,
        'th': `${SITE_URL}/th/shop/${id}`,
      },
    },
  };
}

export default async function ProductDetailPage({ 
  params 
}: { 
  params: Promise<{ locale: string; id: string }> 
}) {
  const { locale, id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <>
      {/* Breadcrumb Schema */}
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: `${SITE_URL}/${locale}` },
        { name: 'Equipment Shop', url: `${SITE_URL}/${locale}/shop` },
        { name: product.name, url: `${SITE_URL}/${locale}/shop/${id}` },
      ])} />
      
      {/* Product Schema */}
      <JsonLd data={productSchema({
        name: product.name,
        description: product.longDescription || product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        brand: product.brand,
        stockStatus: product.stockStatus,
      })} />
      
      <ProductDetailClient productId={id} />
    </>
  );
}
