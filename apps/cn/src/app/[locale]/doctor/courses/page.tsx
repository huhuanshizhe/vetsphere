import DoctorCoursesPage from '@vetsphere/shared/pages/cn/doctor/DoctorCoursesPage';

export default async function CoursesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DoctorCoursesPage locale={locale} />;
}
