import { NextRequest, NextResponse } from 'next/server';

interface LocaleProxyConfig {
  locales: readonly string[];
  defaultLocale: string;
  requestLocaleHeader?: string;
}

export function createLocaleProxy(config: LocaleProxyConfig) {
  const { locales, defaultLocale, requestLocaleHeader } = config;

  function getLocaleFromPath(pathname: string): string | null {
    const segments = pathname.split('/');
    const potentialLocale = segments[1];
    if ((locales as readonly string[]).includes(potentialLocale)) {
      return potentialLocale;
    }
    return null;
  }

  function proxy(request: NextRequest) {
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
      const requestHeaders = new Headers(request.headers);
      if (requestLocaleHeader) {
        requestHeaders.set(requestLocaleHeader, pathnameLocale);
      }

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      response.cookies.set('NEXT_LOCALE', pathnameLocale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
      return response;
    }

    const newUrl = new URL(`/${defaultLocale}${pathname}`, request.url);
    newUrl.search = request.nextUrl.search;

    const response = NextResponse.redirect(newUrl);
    response.cookies.set('NEXT_LOCALE', defaultLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  }

  return { proxy, locales, defaultLocale };
}

export const localeProxyMatcherConfig = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};
