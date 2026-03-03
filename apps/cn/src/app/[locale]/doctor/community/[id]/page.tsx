import { DoctorCommunityPostDetailPage } from '@vetsphere/shared/pages/cn/doctor/DoctorCommunityPostDetailPage';

export function generateStaticParams() {
  return [
    { locale: 'zh', id: '1' },
    { locale: 'zh', id: '2' },
    { locale: 'zh', id: '3' }
  ];
}

export default function CommunityPostDetailRoute({ params }: { params: { locale: string; id: string } }) {
  return <DoctorCommunityPostDetailPage locale={params.locale} postId={params.id} />;
}
