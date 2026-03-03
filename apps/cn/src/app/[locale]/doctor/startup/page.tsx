import DoctorStartupPage from '@vetsphere/shared/pages/cn/doctor/DoctorStartupPage';

export default async function StartupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorStartupPage locale={locale} />;
}
