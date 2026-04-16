import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  transpilePackages: ["@vetsphere/shared"],
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js"],
  },
  allowedDevOrigins: [
    "guidance.vetsphere.cn",
  ],
};

export default nextConfig;
