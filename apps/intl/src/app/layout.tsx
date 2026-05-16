import type { Metadata } from "next";
import { siteConfig } from '@/config/site.config';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
