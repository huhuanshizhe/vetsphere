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
  description: "VetSphere 器械供应商管理后台 - 发布商品、管理库存、处理订单",
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
