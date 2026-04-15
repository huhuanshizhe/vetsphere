import CourseBuyPage from '@vetsphere/shared/components/course-buy/CourseBuyPage';

export const metadata = {
  robots: 'noindex, nofollow',
};

export default async function CourseBuyRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  return <CourseBuyPage courseId={id} locale={locale} site="intl" />;
}
