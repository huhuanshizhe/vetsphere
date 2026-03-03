import { GrowthSystemPage } from '@vetsphere/shared/pages/cn/GrowthSystemPage';

export function generateStaticParams() {
  return [{ locale: 'zh' }];
}

export default function GrowthSystemRoute({ params }: { params: { locale: string } }) {
  return <GrowthSystemPage locale={params.locale} />;
}
