import type { Metadata } from "next";
import Providers from "@vetsphere/shared/components/Providers";
import { siteConfig } from "@/config/site.config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://admin.vetsphere.cn"),
  title: {
    default: "VetSphere 系统管理",
    template: "%s | VetSphere Admin",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers locale="zh" locales={siteConfig.locales} defaultLocale={siteConfig.defaultLocale} siteConfig={siteConfig}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
