"use client";

import { useSession } from "next-auth/react";
import { Alert, Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { resendVerificationEmail } from "@/lib/actions/email-verification";

export function VerifyEmailBanner() {
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(false);

  if (status !== "authenticated" || !session?.user?.id) return null;
  if (session.user.emailVerified != null) return null;

  async function handleResend() {
    setLoading(true);
    try {
      const result = await resendVerificationEmail();
      if (result.error) {
        notifications.show({
          title: "Error",
          message: result.error,
          color: "red",
        });
        return;
      }
      notifications.show({
        title: "Verification email sent",
        message: "Check your inbox for the link.",
        color: "green",
      });
      await update();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Alert
      variant="light"
      color="orange"
      className="rounded-none border-0 border-b border-border"
      title="Please verify your email."
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm">Check your inbox or resend the verification link.</span>
        <Button
          variant="subtle"
          size="xs"
          color="orange"
          onClick={handleResend}
          loading={loading}
        >
          Resend
        </Button>
      </div>
    </Alert>
  );
}
