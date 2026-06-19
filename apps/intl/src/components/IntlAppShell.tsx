'use client';

import IntlChatWidget from './IntlChatWidget';
import { useSiteConfig } from '@vetsphere/shared/context/SiteConfigContext';

interface IntlAppShellProps {
  children: React.ReactNode;
}

export default function IntlAppShell({ children }: IntlAppShellProps) {
  const { siteConfig } = useSiteConfig();
  const showChat = siteConfig.features.aiConsultation;

  return (
    <>
      {children}
      {showChat && <IntlChatWidget />}
    </>
  );
}
