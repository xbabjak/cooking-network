"use client";

import { useRouter } from "next13-progressbar";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { verifyEmail } from "@/lib/actions/email-verification";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    verifyEmail(token).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setError(result.error);
        setStatus("error");
        return;
      }
      setStatus("success");
      router.push("/login?verified=1");
      router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="text-sm text-muted">
            Invalid or missing link. Request a new one.
          </p>
          <Link
            href="/login/resend-verification"
            className="text-primary hover:underline font-medium"
          >
            Resend verification email
          </Link>
          <p className="text-sm text-muted">
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="text-sm text-muted">Verifying…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="text-sm text-error">{error}</p>
          <Link
            href="/login/resend-verification"
            className="text-primary hover:underline font-medium"
          >
            Request new verification link
          </Link>
          <p className="text-sm text-muted">
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="text-sm text-muted">Redirecting to sign in…</p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
          Loading…
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
