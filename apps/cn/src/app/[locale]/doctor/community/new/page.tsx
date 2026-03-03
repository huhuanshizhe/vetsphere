import { DoctorNewCommunityPostPage } from '@vetsphere/shared/pages/cn/doctor/DoctorNewCommunityPostPage';

export function generateStaticParams() {
  return [{ locale: 'zh' }];
}

export default async function NewCommunityPostRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorNewCommunityPostPage locale={locale} />;
}
