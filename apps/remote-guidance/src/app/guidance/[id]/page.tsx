import GuidanceSessionDetailClient from "@/components/guidance/GuidanceSessionDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GuidanceDetailPage({ params }: Props) {
  const { id } = await params;

  return <GuidanceSessionDetailClient sessionId={id} />;
}
