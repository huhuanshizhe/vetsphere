import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Providers from "@/components/Providers";
import JsonLd, { organizationSchema, websiteSchema } from "@/components/JsonLd";
import { locales, Locale } from "@/middleware";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  
  const titles: Record<string, string> = {
    zh: "VetSphere | \u5168\u7403\u5BA0\u7269\u533B\u751F\u4E13\u4E1A\u6559\u80B2\u4E0E\u5668\u68B0\u5E73\u53F0",
    en: "VetSphere | Global Veterinary Surgery Education Platform",
    th: "VetSphere | \u0E41\u0E1E\u0E25\u0E15\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E28\u0E31\u0E25\u0E22\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E31\u0E15\u0E27\u0E41\u0E1E\u0E17\u0E22\u0E4C\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E42\u0E25\u0E01",
  };

  return {
    title: {
      default: titles[locale] || titles.en,
      template: "%s | VetSphere",
    },
    alternates: {
      canonical: `https://vetsphere.com/${locale}`,
      languages: {
        "en": "https://vetsphere.com/en",
        "zh-CN": "https://vetsphere.com/zh",
        "th": "https://vetsphere.com/th",
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const langMap: Record<string, string> = {
    zh: "zh-CN",
    en: "en",
    th: "th",
  };

  return (
    <html lang={langMap[locale] || "en"} suppressHydrationWarning>
      <head>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
      </head>
      <body>
        <Providers locale={locale as Locale}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
