import { VerifyEmailToken } from "@/components/auth/verify-email-token";

export default async function VerifyEmailTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <VerifyEmailToken token={token} />;
}
