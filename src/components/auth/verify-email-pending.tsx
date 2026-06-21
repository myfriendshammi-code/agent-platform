"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Card } from "@/components/ui/form";

export function VerifyEmailPending({ email }: { email?: string }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email ? { email } : {}),
    });
    setLoading(false);

    if (!response.ok) {
      setError("Could not send verification email");
      return;
    }

    setSent(true);
  }

  return (
    <Card className="mx-auto w-full max-w-md text-center">
      <h1 className="text-2xl font-bold">Verify your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Check your inbox for the verification link. In development, the link is printed in the server console.
      </p>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {sent && (
        <div className="mt-4">
          <Alert variant="success">Verification email sent again.</Alert>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <Button type="button" onClick={resend} disabled={loading}>
          {loading ? "Sending..." : "Resend verification email"}
        </Button>
        <Link href="/login" className="text-sm text-muted-foreground underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    </Card>
  );
}
