import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd, { breadcrumbSchema, categoryPageSchema } from '@vetsphere/shared/components/JsonLd';
import { siteConfig } from '@/config/site.config';
import CategoryShopClient from './CategoryShopClient';

// Category metadata for SEO
const categoryMeta: Record<string, {
  title: Record<string, string>;
  description: Record<string, string>;
  keywords: string[];
}> = {
  'imaging-diagnostics': {
    title: {
      en: 'Veterinary Imaging & Diagnostics Equipment',
      th: 'อุปกรณ์ถ่ายภาพและวินิจฉัยสำหรับสัตวแพทย์',
      ja: '獣医画像診断機器',
    },
    description: {
      en: 'Professional veterinary imaging equipment including ultrasound systems, digital radiography, and endoscopy solutions for clinical diagnostics.',
      th: 'อุปกรณ์ถ่ายภาพสำหรับสัตวแพทย์รวมถึงระบบอัลตราซาวด์ รังสีดิจิทัล และกล้องส่องตรวจสำหรับการวินิจฉัยทางคลินิก',
      ja: '超音波システム、デジタルX線，内視鏡など、臨床診断用の獣医画像診断機器。',
    },
    keywords: ['veterinary ultrasound', 'digital radiography', 'endoscopy', 'diagnostic imaging', 'veterinary equipment'],
  },
  'surgery-anesthesia': {
    title: {
      en: 'Veterinary Surgery & Anesthesia Equipment',
      th: 'อุปกรณ์ศัลยกรรมและดมยาสำหรับสัตวแพทย์',
      ja: '獣医外科・麻酔機器',
    },
    description: {
      en: 'ISO 13485 certified surgical instruments, anesthesia machines, and monitoring equipment for veterinary surgical procedures.',
      th: 'เครื่องมือผ่าตัดรับรอง ISO 13485 เครื่องดมยา และอุปกรณ์ตรวจติดตามสำหรับการผ่าตัดสัตว์',
      ja: 'ISO 13485認証の手術器具、麻酔器、モニタリング機器。',
    },
    keywords: ['surgical instruments', 'anesthesia machine', 'veterinary surgery', 'TPLO saw', 'monitoring equipment'],
  },
  'in-house-lab': {
    title: {
      en: 'In-House Veterinary Laboratory Equipment',
      th: 'อุปกรณ์ห้องปฏิบัติการในคลินิกสัตวแพทย์',
      ja: '院内獣医検査室機器',
    },
    description: {
      en: 'Laboratory analyzers and diagnostic equipment for in-clinic testing, including hematology, chemistry, and point-of-care solutions.',
      th: 'เครื่องวิเคราะห์ห้องปฏิบัติการและอุปกรณ์วินิจฉัยสำหรับการตรวจในคลินิก',
      ja: '血液学、生化学、ポイントオブケア検査用の院内検査機器。',
    },
    keywords: ['laboratory analyzer', 'hematology', 'chemistry analyzer', 'point-of-care', 'veterinary diagnostics'],
  },
  'daily-supplies': {
    title: {
      en: 'Daily Clinical Supplies for Veterinary Practice',
      th: 'เวชภัณฑ์ประจำวันสำหรับคลินิกสัตวแพทย์',
      ja: '獣医臨床用日常消耗品',
    },
    description: {
      en: 'Essential consumables and supplies for daily veterinary clinical operations, including syringes, sutures, and examination tools.',
      th: 'วัสดุสิ้นเปลืองที่จำเป็นสำหรับการดำเนินงานทางคลินิกสัตวแพทย์ประจำวัน',
      ja: '注射器、縫合糸、検査器具など、獣医臨床に必要な日常消耗品。',
    },
    keywords: ['veterinary supplies', 'consumables', 'clinical supplies', 'sutures', 'examination tools'],
  },
  'course-equipment': {
    title: {
      en: 'Course-Recommended Veterinary Equipment',
      th: 'อุปกรณ์แนะนำจากหลักสูตรสัตวแพทย์',
      ja: 'コース推奨獣医機器',
    },
    description: {
      en: 'Equipment recommended and used in VetSphere training programs. Get hands-on with the same tools used by expert instructors.',
      th: 'อุปกรณ์ที่แนะนำและใช้ในหลักสูตรฝึกอบรม VetSphere',
      ja: 'VetSphereトレーニングプログラムで使用・推奨される機器。',
    },
    keywords: ['training equipment', 'course recommended', 'veterinary training', 'VetSphere courses'],
  },
};

// Get valid category slugs from config
function getValidCategorySlugs(): string[] {
  const tabDimension = siteConfig.shopCategories?.dimensions.find(d => d.displayAs === 'tabs');
  return tabDimension?.categories.map(c => c.slug || c.key) || [];
}

// Generate static params for all categories
export async function generateStaticParams() {
  const slugs = getValidCategorySlugs();
  const locales = siteConfig.locales;

  const params: { locale: string; categorySlug: string }[] = [];
  for (const locale of locales) {
    for (const slug of slugs) {
      params.push({ locale, categorySlug: slug });
    }
  }
  return params;
}

// Generate metadata for each category page
export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; categorySlug: string }>
}): Promise<Metadata> {
  const { locale, categorySlug } = await params;
  const meta = categoryMeta[categorySlug];

  if (!meta) {
    return {
      title: 'Equipment Category | VetSphere',
    };
  }

  const title = meta.title[locale] || meta.title.en;
  const description = meta.description[locale] || meta.description.en;

  return {
    title,
    description,
    keywords: meta.keywords,
    openGraph: {
      title: `${title} | VetSphere`,
      description,
      url: `${siteConfig.siteUrl}/${locale}/shop/${categorySlug}`,
      siteName: siteConfig.siteName,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | VetSphere`,
      description,
    },
    alternates: {
      canonical: `${siteConfig.siteUrl}/${locale}/shop/${categorySlug}`,
      languages: Object.fromEntries(
        siteConfig.locales.map(l => [l, `${siteConfig.siteUrl}/${l}/shop/${categorySlug}`])
      ),
    },
  };
}

export default async function CategoryPage({
  params
}: {
  params: Promise<{ locale: string; categorySlug: string }>
}) {
  const { locale, categorySlug } = await params;

  // Validate category slug
  const validSlugs = getValidCategorySlugs();
  if (!validSlugs.includes(categorySlug)) {
    notFound();
  }

  // Get category info from config
  const tabDimension = siteConfig.shopCategories?.dimensions.find(d => d.displayAs === 'tabs');
  const category = tabDimension?.categories.find(c => (c.slug || c.key) === categorySlug);
  const categoryName = category?.labels[locale] || category?.labels.en || categorySlug;
  const meta = categoryMeta[categorySlug];
  const categoryDescription = meta?.description[locale] || meta?.description.en || '';

  return (
    <>
      {/* Breadcrumb JSON-LD */}
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: siteConfig.siteUrl },
        { name: 'Equipment Shop', url: `${siteConfig.siteUrl}/${locale}/shop` },
        { name: categoryName, url: `${siteConfig.siteUrl}/${locale}/shop/${categorySlug}` },
      ])} />

      {/* Category Page JSON-LD - CollectionPage Schema */}
      <JsonLd data={categoryPageSchema({
        siteConfig,
        categoryName,
        categorySlug,
        locale,
        description: categoryDescription,
      })} />

      <CategoryShopClient
        categorySlug={categorySlug}
        categoryName={categoryName}
        locale={locale}
      />
    </>
  );
}
