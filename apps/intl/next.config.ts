import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'uuid', 'lucide-react'],
    webpackBuildWorker: true,
  },
  transpilePackages: ['@vetsphere/shared'],
  allowedDevOrigins: [
    'vetsphere.net',
    'www.vetsphere.net',
  ],
  // Production optimizations
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
