"use client";

import { TextInput } from "@mantine/core";
import { useState } from "react";
import Link from "next/link";
import { resendVerificationEmail } from "@/lib/actions/email-verification";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const result = await resendVerificationEmail(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <h1 className="text-2xl font-bold text-center">Resend verification email</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">
              If an account exists and is unverified, we&apos;ve sent a
              verification link.
            </p>
          )}
          {error && <p className="text-sm text-error">{error}</p>}
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
            disabled={success}
          />
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-md disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send verification link"}
          </button>
        </form>
        <p className="text-center text-sm text-muted">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
