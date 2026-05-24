import type { Metadata } from "next";
import { headers } from 'next/headers';
import { siteConfig } from '@/config/site.config';
import { getHtmlLang } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getHtmlLang((await headers()).get('x-vetsphere-locale'));

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
