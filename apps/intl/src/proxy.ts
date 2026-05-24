import { createLocaleProxy } from '@vetsphere/shared/lib/locale-proxy';
import { siteConfig } from '@/config/site.config';

const { proxy, locales, defaultLocale } = createLocaleProxy({
  locales: siteConfig.locales,
  defaultLocale: siteConfig.defaultLocale,
  requestLocaleHeader: 'x-vetsphere-locale',
});

export { proxy, locales, defaultLocale };
export type Locale = (typeof siteConfig.locales)[number];
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};
