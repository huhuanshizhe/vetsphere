import WaitingRoom from "@/components/guidance/WaitingRoom";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GuidanceSessionPage({ params }: Props) {
  const { id } = await params;

  // 候诊室作为默认入口（一键入房体验）
  return <WaitingRoom sessionId={id} />;
}
