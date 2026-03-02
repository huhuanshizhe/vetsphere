'use client';

import ConditionalLayout from '@vetsphere/shared/components/ConditionalLayout';

export default function LocaleTemplate({ children }: { children: React.ReactNode }) {
  return <ConditionalLayout>{children}</ConditionalLayout>;
}
