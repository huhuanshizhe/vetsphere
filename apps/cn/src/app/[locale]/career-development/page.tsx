import { CareerDevelopmentPage } from '@vetsphere/shared/pages/cn/CareerDevelopmentPage';

export function generateStaticParams() {
  return [{ locale: 'zh' }];
}

export default async function CareerDevPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <CareerDevelopmentPage locale={locale} />;
}
