import { redirect } from 'next/navigation';

// /community 路由重定向到 /community-intro（公开价值页）
// 登录用户的社区工具页在 /doctor/community
export default function CommunityRedirectPage({
  params,
}: {
  params: { locale: string };
}) {
  redirect(`/${params.locale}/community-intro`);
}
