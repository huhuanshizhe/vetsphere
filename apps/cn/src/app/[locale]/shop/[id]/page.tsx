import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd, { productSchema, breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import CnProductDetailClient from '@vetsphere/shared/pages/cn/CnProductDetailClient';
import { PRODUCTS_CN } from '@vetsphere/shared';
import { Product } from '@vetsphere/shared/types';
import { supabase } from '@vetsphere/shared/services/supabase';
import { siteConfig } from '@/config/site.config';

const locales = siteConfig.locales;
type Locale = (typeof locales)[number];

// 获取商品数据 - 优先数据库，回退常量
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

// 生成静态参数
export async function generateStaticParams() {
  const params: { locale: string; id: string }[] = [];
  
  // Mock 商品 ID
  const mockIds = ['suture-kit-basic', 'tplo-saw-blade-set', 'ultrasound-system-pro'];
  
  try {
    const { data } = await supabase.from('products').select('id');
    if (data && data.length > 0) {
      for (const locale of locales) {
        for (const row of data) {
          params.push({ locale, id: (row as any).id });
        }
        // 添加 Mock 商品
        for (const mockId of mockIds) {
          params.push({ locale, id: mockId });
        }
      }
      return params;
    }
  } catch {}

  for (const locale of locales) {
    for (const product of PRODUCTS_CN) {
      params.push({ locale, id: product.id });
    }
    // 添加 Mock 商品
    for (const mockId of mockIds) {
      params.push({ locale, id: mockId });
    }
  }
  
  return params;
}

// 动态 SEO 元数据
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string; id: string }> 
}): Promise<Metadata> {
  const { locale, id } = await params;
  const product = await getProductById(id);
  
  if (!product) {
    return {
      title: '商品未找到 | 临床器械与耗材 | 宠医界',
      description: '您访问的商品不存在或已下架',
    };
  }

  const productUrl = `${siteConfig.siteUrl}/${locale}/shop/${id}`;
  const title = product.name;
  const description = `${product.description} 品牌：${product.brand}。`;

  return {
    title: `${title} | 临床器械与耗材 | 宠医界`,
    description: `${description} ${product.longDescription || ''}`.slice(0, 160),
    keywords: [
      product.name,
      product.brand,
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
        siteConfig.locales.map(l => [l === 'zh' ? 'zh-CN' : l, `${siteConfig.siteUrl}/${l}/shop/${id}`])
      ),
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

  // 检查是否为 Mock 商品
  const mockIds = ['suture-kit-basic', 'tplo-saw-blade-set', 'ultrasound-system-pro'];
  const isMockProduct = mockIds.includes(id);

  if (!product && !isMockProduct) {
    notFound();
  }

  return (
    <>
      {/* 面包屑 Schema */}
      <JsonLd data={breadcrumbSchema([
        { name: '首页', url: `${siteConfig.siteUrl}/${locale}` },
        { name: '临床器械与耗材', url: `${siteConfig.siteUrl}/${locale}/shop` },
        { name: product?.name || '商品详情', url: `${siteConfig.siteUrl}/${locale}/shop/${id}` },
      ])} />
      
      {/* 产品 Schema */}
      {product && (
        <JsonLd data={productSchema(siteConfig, {
          name: product.name,
          description: product.longDescription || product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          brand: product.brand,
          stockStatus: product.stockStatus,
        })} />
      )}
      
      <CnProductDetailClient productId={id} />
    </>
  );
}
