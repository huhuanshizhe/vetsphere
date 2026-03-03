import type { Metadata } from 'next';
import CnComingSoonPage from '@vetsphere/shared/pages/cn/CnComingSoonPage';

export const metadata: Metadata = {
  title: '即将上线 - VetSphere',
  description: '该功能正在完善中，敬请期待。',
  robots: { index: false, follow: false },
};

export default async function ComingSoonPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { locale } = await params;
  const query = await searchParams;

  return (
    <CnComingSoonPage
      module={query.module}
      source={query.source}
      target={query.target}
      title={query.title}
      locale={locale}
    />
  );
}
