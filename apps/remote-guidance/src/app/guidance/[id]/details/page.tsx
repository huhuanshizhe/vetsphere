import GuidanceSessionDetailClient from "@/components/guidance/GuidanceSessionDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GuidanceSessionDetailsPage({ params }: Props) {
  const { id } = await params;

  // 详细信息页面：时间轴、标注、参与者管理等
  return <GuidanceSessionDetailClient sessionId={id} />;
}