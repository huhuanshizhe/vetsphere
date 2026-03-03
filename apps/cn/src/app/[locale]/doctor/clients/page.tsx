import DoctorClientsPage from '@vetsphere/shared/pages/cn/doctor/DoctorClientsPage';

export default async function ClientsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorClientsPage locale={locale} />;
}
