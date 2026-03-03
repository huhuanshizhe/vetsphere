import { redirect } from 'next/navigation';

/**
 * /user 页面重定向
 * 
 * /user 不再作为独立主入口，直接重定向到医生工作台设置页的个人资料分区
 */
export default async function UserCenterPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  redirect(`/${locale}/doctor/settings?tab=profile`);
}
