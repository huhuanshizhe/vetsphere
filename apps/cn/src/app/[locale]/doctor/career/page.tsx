import DoctorCareerPage from '@vetsphere/shared/pages/cn/doctor/DoctorCareerPage';

export default async function CareerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorCareerPage locale={locale} />;
}
