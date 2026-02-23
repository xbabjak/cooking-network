"use client";

import { TextInput, Textarea, PasswordInput } from "@mantine/core";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialName: string;
  initialUsername: string;
  initialImage: string | null;
  initialBio: string | null;
  canChangePassword: boolean;
};

export function ProfileEditForm({
  initialName,
  initialUsername,
  initialImage,
  initialBio,
  canChangePassword,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [username, setUsername] = useState(initialUsername ?? "");
  const [image, setImage] = useState(initialImage ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (canChangePassword && newPassword) {
        if (newPassword !== confirmPassword) {
          setError("New passwords do not match.");
          setSubmitting(false);
          return;
        }
        if (!currentPassword) {
          setError("Current password is required to change password.");
          setSubmitting(false);
          return;
        }
      }

      const profileRes = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          username: username || undefined,
          image: image.trim() || "",
          bio: bio || undefined,
        }),
      });

      const profileData = await profileRes.json().catch(() => ({}));
      if (!profileRes.ok) {
        setError(
          typeof profileData.error === "string"
            ? profileData.error
            : profileData.error?.username?.[0] ?? "Failed to update profile."
        );
        setSubmitting(false);
        return;
      }

      if (canChangePassword && currentPassword && newPassword) {
        const passwordRes = await fetch("/api/user/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        });

        const passwordData = await passwordRes.json().catch(() => ({}));
        if (!passwordRes.ok) {
          setError(
            typeof passwordData.error === "string"
              ? passwordData.error
              : "Failed to change password."
          );
          setSubmitting(false);
          return;
        }
      }

      setSuccess("Profile updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && <p className="text-sm text-error">{error}</p>}
      {success && <p className="text-sm text-primary">{success}</p>}

      <TextInput
        label="Name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />
      <TextInput
        label="Username (for your blog URL)"
        description="Letters, numbers, underscore, hyphen. 2–30 characters."
        value={username}
        onChange={(e) => setUsername(e.currentTarget.value)}
        pattern="^[a-zA-Z0-9_-]+$"
        minLength={2}
        maxLength={30}
      />
      <TextInput
        label="Profile image URL"
        value={image}
        onChange={(e) => setImage(e.currentTarget.value)}
        placeholder="https://..."
      />
      <Textarea
        label="Bio"
        value={bio}
        onChange={(e) => setBio(e.currentTarget.value)}
        minRows={3}
      />

      {canChangePassword && (
        <div className="space-y-3 p-4 border border-border rounded-lg bg-surface-alt">
          <h3 className="font-medium">Change password</h3>
          <PasswordInput
            label="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          />
          <PasswordInput
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            minLength={6}
          />
          <PasswordInput
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground font-medium rounded-md"
      >
        {submitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
