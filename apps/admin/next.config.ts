import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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