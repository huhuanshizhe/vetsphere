import type { SiteConfig } from "@vetsphere/shared/site-config";

export const siteConfig: SiteConfig = {
  market: "cn",
  siteName: "VetSphere Remote Guidance",
  domain: "guidance.vetsphere.cn",
  siteUrl: "https://guidance.vetsphere.cn",
  locales: ["zh"] as const,
  defaultLocale: "zh",
  paymentProviders: ["Quote"] as const,
  defaultCurrency: "CNY",
  contactEmail: "guidance@vetsphere.cn",
  noreplyEmail: "noreply@vetsphere.cn",
  storagePrefix: "vetsphere_guidance_",
  organizationName: "VetSphere",
  organizationAddress: { locality: "Shanghai", country: "CN" },
  features: { liveStreaming: true, aiConsultation: false, communityPosts: false },
};
