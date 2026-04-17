import type { NextConfig } from 'next';
import path from 'path';

interface CreateNextConfigOptions {
  /** __dirname from the calling app's next.config.ts — enables turbopack root */
  dirname?: string;
  /** Allowed dev origins for CORS */
  allowedDevOrigins?: string[];
  /** Additional image remote patterns (appended to defaults) */
  extraImagePatterns?: NextConfig['images'] extends { remotePatterns?: infer R } ? R : never;
  /** Override image config fields (merged on top of defaults) */
  imageOverrides?: Partial<NonNullable<NextConfig['images']>>;
  /** Env variables to expose to the browser */
  env?: Record<string, string | undefined>;
  /** Experimental config (merged with defaults) */
  experimental?: NonNullable<NextConfig['experimental']>;
  /** Override compiler settings; defaults to removeConsole in production */
  compiler?: NextConfig['compiler'];
  /** Production source maps */
  productionBrowserSourceMaps?: boolean;
}

const DEFAULT_IMAGE_PATTERNS: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = [
  { protocol: 'https', hostname: 'images.unsplash.com' },
  { protocol: 'https', hostname: '*.supabase.co' },
  { protocol: 'https', hostname: 'placehold.co' },
  { protocol: 'https', hostname: '*.aliyuncs.com' },
];

export function createNextConfig(options: CreateNextConfigOptions = {}): NextConfig {
  const config: NextConfig = {
    images: {
      remotePatterns: [
        ...DEFAULT_IMAGE_PATTERNS,
        ...(options.extraImagePatterns ?? []),
      ],
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      minimumCacheTTL: 60 * 60 * 24 * 7,
      ...options.imageOverrides,
    },
    transpilePackages: ['@vetsphere/shared'],
    compiler: options.compiler ?? {
      removeConsole:
        process.env.NODE_ENV === 'production'
          ? { exclude: ['warn', 'error'] }
          : false,
    },
    experimental: {
      optimizePackageImports: ['@supabase/supabase-js', 'uuid'],
      ...options.experimental,
    },
  };

  if (options.dirname) {
    config.turbopack = { root: path.join(options.dirname, '../..') };
  }

  if (options.allowedDevOrigins) {
    config.allowedDevOrigins = options.allowedDevOrigins;
  }

  if (options.env) {
    config.env = options.env;
  }

  if (options.productionBrowserSourceMaps !== undefined) {
    config.productionBrowserSourceMaps = options.productionBrowserSourceMaps;
  }

  return config;
}
