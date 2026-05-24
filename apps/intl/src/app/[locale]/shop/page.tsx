import type { Metadata } from 'next';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import IntlShopPageClient from '@vetsphere/shared/pages/intl/IntlShopPageClient';
import {
  getIntlProductBrands,
  getIntlProductCategoryTree,
  getIntlProducts,
} from '@vetsphere/shared/services/intl-api';
import { siteConfig } from '@/config/site.config';
import { buildLocaleAlternates } from '@/lib/seo';

type SearchParamValue = string | string[] | undefined;
type ShopSortOption = 'featured' | 'newest' | 'price-low' | 'price-high' | 'name-asc';
type ShopFilterParams = {
  search?: string;
  categoryId?: string;
  brands?: string[];
  priceMin?: number;
  priceMax?: number;
  purchaseType?: 'direct' | 'quote';
  sortBy: ShopSortOption;
  limit: number;
  offset: number;
};

const SHOP_PAGE_SIZE = 24;
const SHOP_SORT_OPTIONS: ShopSortOption[] = [
  'featured',
  'newest',
  'price-low',
  'price-high',
  'name-asc',
];

function getSingleSearchParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseNumberParam(value: SearchParamValue): number | undefined {
  const rawValue = getSingleSearchParam(value);
  if (!rawValue) return undefined;

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseShopSearchParams(searchParams: Record<string, SearchParamValue>): ShopFilterParams {
  const search = getSingleSearchParam(searchParams.q)?.trim() || undefined;
  const categoryId = getSingleSearchParam(searchParams.category)?.trim() || undefined;
  const brands =
    getSingleSearchParam(searchParams.brands)
      ?.split(',')
      .map((brand) => brand.trim())
      .filter(Boolean) || [];
  const priceMin = parseNumberParam(searchParams.priceMin);
  const priceMax = parseNumberParam(searchParams.priceMax);
  const purchaseTypeValue = getSingleSearchParam(searchParams.purchaseType);
  const purchaseType: 'direct' | 'quote' | undefined =
    purchaseTypeValue === 'direct' || purchaseTypeValue === 'quote' ? purchaseTypeValue : undefined;
  const sortValue = getSingleSearchParam(searchParams.sort);
  const sortBy: ShopSortOption = SHOP_SORT_OPTIONS.includes(sortValue as ShopSortOption)
    ? (sortValue as ShopSortOption)
    : 'featured';
  const pageValue = parseInt(getSingleSearchParam(searchParams.page) || '1', 10);
  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;

  const filterParams: ShopFilterParams = {
    sortBy,
    limit: SHOP_PAGE_SIZE,
    offset: (page - 1) * SHOP_PAGE_SIZE,
  };

  if (search) {
    filterParams.search = search;
  }

  if (categoryId) {
    filterParams.categoryId = categoryId;
  }

  if (brands.length > 0) {
    filterParams.brands = brands;
  }

  if (typeof priceMin === 'number') {
    filterParams.priceMin = priceMin;
  }

  if (typeof priceMax === 'number') {
    filterParams.priceMax = priceMax;
  }

  if (purchaseType) {
    filterParams.purchaseType = purchaseType;
  }

  return filterParams;
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, SearchParamValue>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    en: 'Veterinary Equipment & Instruments | VetSphere',
    th: 'อุปกรณ์และเครื่องมือสัตวแพทย์ | VetSphere',
    ja: '獣医機器・器具 | VetSphere',
  };

  const descriptions: Record<string, string> = {
    en: 'Training-compatible veterinary equipment: surgical instruments, implants, power tools, and monitoring systems. Purchase directly or request a custom quote.',
    th: 'อุปกรณ์สัตวแพทย์ที่เข้ากันได้กับการฝึกอบรม: เครื่องมือผ่าตัด, อุปกรณ์ปลูกถ่าย, เครื่องมือไฟฟ้า',
    ja: 'トレーニング対応獣医機器：手術器具、インプラント、電動工具、モニタリングシステム',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    keywords: ['veterinary equipment', 'surgical instruments', 'TPLO saw', 'veterinary implants', 'clinical tools'],
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${siteConfig.siteUrl}/${locale}/shop`,
      siteName: siteConfig.siteName,
      type: 'website',
    },
    alternates: buildLocaleAlternates({
      path: 'shop',
      canonicalLocale: locale,
      xDefaultUrl: `${siteConfig.siteUrl}/${siteConfig.defaultLocale}/shop`,
    }),
  };
}

export default async function ShopPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const initialFilterParams = parseShopSearchParams(await searchParams);
  const productRequestKey = JSON.stringify({ locale, ...initialFilterParams });
  const initialProductQuery: Parameters<typeof getIntlProducts>[0] = {
    ...initialFilterParams,
    locale,
    featured: false,
  };
  const featuredProductQuery: Parameters<typeof getIntlProducts>[0] = {
    featured: true,
    limit: 8,
    locale,
  };
  const [productResult, featuredResult, categories, brands] = await Promise.all([
    getIntlProducts(initialProductQuery),
    getIntlProducts(featuredProductQuery),
    getIntlProductCategoryTree(locale),
    getIntlProductBrands(),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: `${siteConfig.siteUrl}/${locale}` },
        { name: 'Equipment', url: `${siteConfig.siteUrl}/${locale}/shop` },
      ])} />
      <IntlShopPageClient
        initialData={{
          locale,
          products: productResult.items,
          total: productResult.total,
          featuredProducts: featuredResult.items,
          categories,
          brands,
          productRequestKey,
        }}
      />
    </>
  );
}
