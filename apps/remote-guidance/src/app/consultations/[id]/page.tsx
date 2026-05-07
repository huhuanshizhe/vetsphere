import ConsultationDetailClient from '@/components/guidance/ConsultationDetailClient';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ConsultationDetailPage({ params }: Props) {
  const { id } = await params;

  return <ConsultationDetailClient consultationId={id} />;
}
