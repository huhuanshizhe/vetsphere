import DoctorRecordsPage from '@vetsphere/shared/pages/cn/doctor/DoctorRecordsPage';

export default async function RecordsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorRecordsPage locale={locale} />;
}
