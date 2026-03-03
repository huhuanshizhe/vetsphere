import DoctorHomePage from '@vetsphere/shared/pages/cn/doctor/DoctorHomePage';

export default async function DoctorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorHomePage locale={locale} />;
}
