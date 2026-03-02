import type { Metadata } from "next";
import Providers from "@vetsphere/shared/components/Providers";
import { siteConfig } from "@/config/site.config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: siteConfig.siteName,
    template: `%s | ${siteConfig.siteName}`,
  },
  description: "VetSphere 课程合作机构管理后台 - 发布课程、管理学员、查看收益",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers
          locale={siteConfig.defaultLocale}
          locales={[...siteConfig.locales]}
          defaultLocale={siteConfig.defaultLocale}
          siteConfig={siteConfig}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
