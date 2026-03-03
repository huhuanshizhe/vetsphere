import DoctorGrowthPage from '@vetsphere/shared/pages/cn/doctor/DoctorGrowthPage';

export default async function GrowthPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorGrowthPage locale={locale} />;
}
