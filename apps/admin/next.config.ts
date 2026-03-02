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
    ],
    formats: ['image/avif', 'image/webp'],
  },
  transpilePackages: ['@vetsphere/shared'],
  allowedDevOrigins: [
    'admin.vetsphere.cn',
  ],
};

export default nextConfig;
