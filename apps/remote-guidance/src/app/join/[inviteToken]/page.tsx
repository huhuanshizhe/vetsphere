import GuidanceGuestJoinClient from "@/components/guidance/GuidanceGuestJoinClient";

type Props = {
  params: Promise<{ inviteToken: string }>;
};

export default async function GuidanceJoinPage({ params }: Props) {
  const { inviteToken } = await params;

  return <GuidanceGuestJoinClient inviteToken={inviteToken} />;
}
