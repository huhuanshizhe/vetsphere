import ObserverRoomClient from "@/components/guidance/ObserverRoomClient";

type Props = {
  params: Promise<{ inviteToken: string }>;
};

export default async function ObserverJoinPage({ params }: Props) {
  const { inviteToken } = await params;

  // 观察员入口：无需登录，只需输入显示名称即可入房观看
  return <ObserverRoomClient inviteToken={inviteToken} />;
}