import { ClinicalToolsPage } from '@vetsphere/shared/pages/cn/ClinicalToolsPage';

export function generateStaticParams() {
  return [{ locale: 'zh' }];
}

export default function ToolsPage({ params }: { params: { locale: string } }) {
  return <ClinicalToolsPage locale={params.locale} />;
}
