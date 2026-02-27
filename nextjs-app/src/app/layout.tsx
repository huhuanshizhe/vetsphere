import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vetsphere.com"),
  title: {
    default: "VetSphere | \u5168\u7403\u5BA0\u7269\u533B\u751F\u4E13\u4E1A\u6559\u80B2\u4E0E\u5668\u68B0\u5E73\u53F0",
    template: "%s | VetSphere",
  },
  description: "VetSphere is the leading global platform for veterinary surgeons.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body className={`${plusJakarta.variable} font-sans antialiased vs-pattern`}>
        {children}
      </body>
    </html>
  );
}
