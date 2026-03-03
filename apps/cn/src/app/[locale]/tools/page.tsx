import { ClinicalToolsPage } from '@vetsphere/shared/pages/cn/ClinicalToolsPage';

export function generateStaticParams() {
  return [{ locale: 'zh' }];
}

export default async function ToolsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ClinicalToolsPage locale={locale} />;
}
