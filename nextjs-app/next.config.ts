import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    // Optimize image loading
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Image sizes for layout optimization
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimize layout shift
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },
  // Experimental features for better performance
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['@supabase/supabase-js', 'uuid'],
  },
  allowedDevOrigins: [
    'veterinary.chanyechuhai.com',
    'vetsphere.com',
    'www.vetsphere.com',
    'vetsphere.net',
    'www.vetsphere.net',
  ],
};

export default nextConfig;
