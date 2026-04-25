"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr((j as { error?: string }).error || "Failed");
      return;
    }
    r.push("/login");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <form onSubmit={onSubmit} className="max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <label className="block text-sm text-zinc-600 dark:text-zinc-400">
          Name
          <input
            className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm text-zinc-600 dark:text-zinc-400">
          Email
          <input
            className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm text-zinc-600 dark:text-zinc-400">
          Password (min 8)
          <input
            className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Register
        </button>
        <p className="text-sm text-zinc-500">
          Have an account? <Link className="underline" href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
