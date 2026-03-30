import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  // Explicitly inline environment variables for client-side code
  env: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
  // Keep console.logs in production for debugging Stripe issues
  compiler: {
    removeConsole: false,
  },
};

export default nextConfig;
