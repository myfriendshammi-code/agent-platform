import { VerifyEmailPending } from "@/components/auth/verify-email-pending";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <VerifyEmailPending email={email} />;
}
