import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site.config';

export const locales = siteConfig.locales;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = siteConfig.defaultLocale as Locale;

function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/');
  const potentialLocale = segments[1];
  if ((locales as readonly string[]).includes(potentialLocale)) {
    return potentialLocale as Locale;
  }
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next();
  }

  const pathnameLocale = getLocaleFromPath(pathname);

  if (pathnameLocale) {
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', pathnameLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  // No locale in path - redirect to default locale (en)
  const newUrl = new URL(`/${defaultLocale}${pathname}`, request.url);
  newUrl.search = request.nextUrl.search;

  const response = NextResponse.redirect(newUrl);
  response.cookies.set('NEXT_LOCALE', defaultLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
