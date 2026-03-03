import DoctorCommunityPage from '@vetsphere/shared/pages/cn/doctor/DoctorCommunityPage';

export default async function CommunityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorCommunityPage locale={locale} />;
}
