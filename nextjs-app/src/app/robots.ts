import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard', '/sys-admin', '/partners/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/dashboard', '/sys-admin', '/partners/'],
      },
    ],
    sitemap: 'https://vetsphere.com/sitemap.xml',
  };
}
