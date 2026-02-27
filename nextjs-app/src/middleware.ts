import { NextRequest, NextResponse } from 'next/server';

export const locales = ['en', 'zh', 'th'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh';

function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/');
  const potentialLocale = segments[1];
  if (locales.includes(potentialLocale as Locale)) {
    return potentialLocale as Locale;
  }
  return null;
}

function getPreferredLocale(request: NextRequest): Locale {
  // Check cookie first
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    if (acceptLanguage.includes('zh')) return 'zh';
    if (acceptLanguage.includes('th')) return 'th';
    if (acceptLanguage.includes('en')) return 'en';
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, API routes, and special Next.js paths
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

  // If pathname already has a valid locale, continue
  if (pathnameLocale) {
    const response = NextResponse.next();
    // Set cookie for consistency
    response.cookies.set('NEXT_LOCALE', pathnameLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return response;
  }

  // No locale in path - redirect to preferred locale
  const preferredLocale = getPreferredLocale(request);
  const newUrl = new URL(`/${preferredLocale}${pathname}`, request.url);
  
  // Preserve query params
  newUrl.search = request.nextUrl.search;

  const response = NextResponse.redirect(newUrl);
  response.cookies.set('NEXT_LOCALE', preferredLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
