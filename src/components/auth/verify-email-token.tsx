"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Card } from "@/components/ui/form";

export function VerifyEmailToken({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    async function verify() {
      const response = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setStatus("ok");
        setTimeout(() => router.push("/login?verified=1"), 1500);
      } else {
        setStatus("error");
      }
    }

    verify();
  }, [token, router]);

  return (
    <Card className="mx-auto w-full max-w-md text-center">
      <h1 className="text-2xl font-bold">Email verification</h1>
      {status === "loading" && <p className="mt-4 text-sm text-muted-foreground">Verifying...</p>}
      {status === "ok" && (
        <Alert variant="success">
          Email verified. Redirecting to sign in...
        </Alert>
      )}
      {status === "error" && (
        <>
          <Alert variant="error">Invalid or expired verification link.</Alert>
          <Link href="/verify-email" className="mt-4 inline-block text-sm underline underline-offset-4">
            Request a new link
          </Link>
        </>
      )}
    </Card>
  );
}
