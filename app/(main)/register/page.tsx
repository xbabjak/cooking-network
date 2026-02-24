"use client";

import { TextInput, PasswordInput } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: name || undefined,
        username: username || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : "Registration failed. Try again."
      );
      return;
    }
    router.push("/login?registered=1");
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <h1 className="text-2xl font-bold text-center">Create account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            minLength={6}
          />
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <TextInput
            label="Username (for your blog URL)"
            description="Letters, numbers, underscore, hyphen. Optional."
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            pattern="^[a-zA-Z0-9_-]+$"
            minLength={2}
            maxLength={30}
          />
          <button
            type="submit"
            className="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-md"
          >
            Sign up
          </button>
        </form>
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
