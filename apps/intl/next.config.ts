import { createNextConfig } from '@vetsphere/shared/lib/next-config';

export default createNextConfig({
  dirname: __dirname,
  allowedDevOrigins: ['vetsphere.net', 'www.vetsphere.net'],
  env: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  imageOverrides: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'uuid', 'lucide-react'],
    webpackBuildWorker: true,
  },
  productionBrowserSourceMaps: false,
});
