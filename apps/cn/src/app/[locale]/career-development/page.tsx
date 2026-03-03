import { CareerDevelopmentPage } from '@vetsphere/shared/pages/cn/CareerDevelopmentPage';

export function generateStaticParams() {
  return [{ locale: 'zh' }];
}

export default function CareerDevPage({ params }: { params: { locale: string } }) {
  return <CareerDevelopmentPage locale={params.locale} />;
}
