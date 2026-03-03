import { redirect } from 'next/navigation';

// /shop 路由重定向到 /clinical-tools（临床工具价值页）
// CN站点的临床工具展示作为职业发展的支持层存在
export default function ShopRedirectPage({
  params,
}: {
  params: { locale: string };
}) {
  redirect(`/${params.locale}/clinical-tools`);
}
