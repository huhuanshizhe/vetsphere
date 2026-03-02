import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://vetsphere.cn"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
