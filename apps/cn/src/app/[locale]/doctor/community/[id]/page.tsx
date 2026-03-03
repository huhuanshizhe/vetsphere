import { DoctorCommunityPostDetailPage } from '@vetsphere/shared/pages/cn/doctor/DoctorCommunityPostDetailPage';

export function generateStaticParams() {
  return [
    { locale: 'zh', id: '1' },
    { locale: 'zh', id: '2' },
    { locale: 'zh', id: '3' }
  ];
}

export default async function CommunityPostDetailRoute({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  return <DoctorCommunityPostDetailPage locale={locale} postId={id} />;
}
