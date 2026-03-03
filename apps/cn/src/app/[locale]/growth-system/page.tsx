import { GrowthSystemPage } from '@vetsphere/shared/pages/cn/GrowthSystemPage';

export function generateStaticParams() {
  return [{ locale: 'zh' }];
}

export default function GrowthSystemRoute() {
  return <GrowthSystemPage />;
}
