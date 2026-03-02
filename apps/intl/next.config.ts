import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'uuid'],
  },
  transpilePackages: ['@vetsphere/shared'],
  allowedDevOrigins: [
    'vetsphere.net',
    'www.vetsphere.net',
  ],
};

export default nextConfig;
