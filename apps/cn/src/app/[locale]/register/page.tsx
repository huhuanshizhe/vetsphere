import { redirect } from 'next/navigation';

// 注册入口页 - 重定向到医生申请页
export default async function RegisterRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/register/doctor`);
}
