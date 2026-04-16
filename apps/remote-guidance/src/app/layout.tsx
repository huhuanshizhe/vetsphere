import type { Metadata } from "next";
import { Noto_Sans_SC, Source_Serif_4 } from "next/font/google";
import "@livekit/components-styles";
import Providers from "@vetsphere/shared/components/Providers";
import GuidanceTopbar from "@/components/guidance/GuidanceTopbar";
import { GuidanceSessionBridgeProvider } from "@/components/guidance/GuidanceSessionBridge";
import { siteConfig } from "@/config/site.config";
import "./globals.css";

const sans = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-guidance-sans",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-guidance-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: "VetSphere Remote Guidance",
    template: "%s | VetSphere Remote Guidance",
  },
  description: "手术实时远程指导独立应用。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable}`}>
        <Providers
          locale="zh"
          locales={siteConfig.locales}
          defaultLocale={siteConfig.defaultLocale}
          siteConfig={siteConfig}
        >
          <GuidanceSessionBridgeProvider>
            <GuidanceTopbar />
            {children}
          </GuidanceSessionBridgeProvider>
        </Providers>
      </body>
    </html>
  );
}
