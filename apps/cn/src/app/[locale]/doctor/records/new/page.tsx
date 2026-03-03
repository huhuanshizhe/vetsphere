import DoctorNewRecordPage from '@vetsphere/shared/pages/cn/doctor/DoctorNewRecordPage';

export default async function NewRecordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorNewRecordPage locale={locale} />;
}
