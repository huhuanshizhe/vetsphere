import { redirect } from 'next/navigation';

export default async function CnVerificationDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/verifications/${id}`);
}
