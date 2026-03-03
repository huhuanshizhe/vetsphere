import DoctorNewConsultationPage from '@vetsphere/shared/pages/cn/doctor/DoctorNewConsultationPage';

export default async function NewConsultationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorNewConsultationPage locale={locale} />;
}
