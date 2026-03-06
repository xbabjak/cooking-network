"use client";

import { TextInput, Textarea, PasswordInput } from "@mantine/core";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next13-progressbar";
import { useSession } from "next-auth/react";
import {
  getProfileDraft,
  setProfileDraft,
  clearProfileDraft,
} from "@/lib/draft-storage";

type Props = {
  initialName: string;
  initialUsername: string;
  initialImage: string | null;
  initialBio: string | null;
  initialSkipDoneCookingConfirm: boolean;
  canChangePassword: boolean;
  hasGoogleAccount?: boolean;
  googleImageUrl?: string | null;
  chefAvatarUrls?: string[];
};

export function ProfileEditForm({
  initialName,
  initialUsername,
  initialImage,
  initialBio,
  initialSkipDoneCookingConfirm,
  canChangePassword,
  hasGoogleAccount = false,
  googleImageUrl = null,
  chefAvatarUrls = [],
}: Props) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName ?? "");
  const [username, setUsername] = useState(initialUsername ?? "");
  const [image, setImage] = useState(initialImage ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [skipDoneCookingConfirm, setSkipDoneCookingConfirm] = useState(
    initialSkipDoneCookingConfirm ?? false
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loadingGeneratedAvatar, setLoadingGeneratedAvatar] = useState(false);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP image (max 2MB).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be 2MB or smaller.");
      return;
    }
    setError("");
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      if (data.url) setImage(data.url);
    } catch {
      setError("Upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleUseGeneratedAvatar() {
    setError("");
    setLoadingGeneratedAvatar(true);
    try {
      const res = await fetch("/api/user/avatar/generated");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to get generated avatar.");
        return;
      }
      if (data.url) setImage(data.url);
    } catch {
      setError("Failed to get generated avatar.");
    } finally {
      setLoadingGeneratedAvatar(false);
    }
  }

  // Restore draft from localStorage on mount
  useEffect(() => {
    const draft = getProfileDraft();
    if (!draft) return;
    setName(draft.name);
    setUsername(draft.username);
    setImage(draft.image);
    setBio(draft.bio);
    setSkipDoneCookingConfirm(draft.skipDoneCookingConfirm);
  }, []);

  // Debounced persist draft to localStorage
  useEffect(() => {
    const ms = 1000;
    const id = setTimeout(() => {
      setProfileDraft({
        name,
        username,
        image,
        bio,
        skipDoneCookingConfirm,
      });
    }, ms);
    return () => clearTimeout(id);
  }, [name, username, image, bio, skipDoneCookingConfirm]);

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
          skipDoneCookingConfirm,
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
      clearProfileDraft();
      await updateSession();
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

      <div className="space-y-3">
        <p className="text-sm font-medium">Profile picture</p>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-shrink-0">
            {image ? (
              <img
                src={image}
                alt=""
                className="w-16 h-16 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-surface-alt border border-border flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                {(name || username || "?")[0]}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            {chefAvatarUrls.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {chefAvatarUrls.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setImage(url)}
                    className={`w-9 h-9 rounded-full overflow-hidden border-2 flex-shrink-0 ${
                      image === url ? "border-primary" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={handleUseGeneratedAvatar}
              disabled={loadingGeneratedAvatar}
              className="text-sm text-left text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {loadingGeneratedAvatar ? "Loading…" : "Use my generated avatar"}
            </button>
            {hasGoogleAccount && googleImageUrl && (
              <button
                type="button"
                onClick={() => setImage(googleImageUrl)}
                className="text-sm text-left text-muted-foreground hover:text-foreground"
              >
                Use my Google photo
              </button>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {uploadingAvatar ? "Uploading…" : "Upload my own"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Textarea
        label="Bio"
        value={bio}
        onChange={(e) => setBio(e.currentTarget.value)}
        minRows={3}
      />

      <div className="p-4 border border-border rounded-lg bg-surface-alt space-y-2">
        <h3 className="font-medium">Cooking</h3>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={skipDoneCookingConfirm}
            onChange={(e) => setSkipDoneCookingConfirm(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="text-sm">
            Skip confirmation when removing groceries after cooking
          </span>
        </label>
      </div>

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
