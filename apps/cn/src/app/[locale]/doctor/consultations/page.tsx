import DoctorConsultationsPage from '@vetsphere/shared/pages/cn/doctor/DoctorConsultationsPage';

export default async function ConsultationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorConsultationsPage locale={locale} />;
}
