import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site.config';

export default function robots(): MetadataRoute.Robots {
  const testPaths = siteConfig.locales.flatMap((locale) => [
    `/${locale}/simple-test`,
    `/${locale}/test-stripe-payment`,
  ]);

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/sys-admin', '/partners/', '/simple-test', '/test-stripe-payment', ...testPaths],
      },
    ],
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  };
}
