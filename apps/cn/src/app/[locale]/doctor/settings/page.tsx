import DoctorSettingsPage from '@vetsphere/shared/pages/cn/doctor/DoctorSettingsPage';

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorSettingsPage locale={locale} />;
}
