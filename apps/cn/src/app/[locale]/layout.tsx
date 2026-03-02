import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Providers from "@vetsphere/shared/components/Providers";
import JsonLd, { organizationSchema, websiteSchema } from "@vetsphere/shared/components/JsonLd";
import { siteConfig } from "@/config/site.config";
import type { SupportedLocale } from "@vetsphere/shared/site-config";
import "../globals.css";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  return siteConfig.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: {
      default: "VetSphere | 全球宠物医生专业教育与器械平台",
      template: "%s | VetSphere",
    },
    alternates: {
      canonical: `${siteConfig.siteUrl}/${locale}`,
      languages: Object.fromEntries(
        siteConfig.locales.map(l => [l === 'zh' ? 'zh-CN' : l, `${siteConfig.siteUrl}/${l}`])
      ),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!(siteConfig.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  return (
    <>
      <JsonLd data={organizationSchema(siteConfig)} />
      <JsonLd data={websiteSchema(siteConfig)} />
      <Providers locale={locale as SupportedLocale} locales={siteConfig.locales} defaultLocale={siteConfig.defaultLocale} siteConfig={siteConfig}>
        {children}
      </Providers>
    </>
  );
}
