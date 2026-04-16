import GuidanceRoomPrepClient from "@/components/guidance/GuidanceRoomPrepClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GuidanceRoomPage({ params }: Props) {
  const { id } = await params;

  return <GuidanceRoomPrepClient sessionId={id} />;
}
