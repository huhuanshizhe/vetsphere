import { DoctorNewCommunityPostPage } from '@vetsphere/shared/pages/cn/doctor/DoctorNewCommunityPostPage';

export function generateStaticParams() {
  return [{ locale: 'zh' }];
}

export default function NewCommunityPostRoute({ params }: { params: { locale: string } }) {
  return <DoctorNewCommunityPostPage locale={params.locale} />;
}
