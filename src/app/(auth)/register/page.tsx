"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const field =
  "mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-zinc-100";

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
    <div className="flex min-h-full flex-1 flex-col items-center justify-center p-6">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-lg font-bold text-white shadow-md">
        B
      </div>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[400px] space-y-5 rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-lg shadow-zinc-900/5 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:shadow-black/20 sm:p-8"
      >
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Create account
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Start brainstorming in a minute.</p>
        </div>
        {err && (
          <p className="rounded-lg border border-red-200/80 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
            {err}
          </p>
        )}
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
          <input
            className={field}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password <span className="font-normal text-zinc-500">(min 8 characters)</span>
          <input
            className={field}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-b from-teal-500 to-teal-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-500/20 transition hover:from-teal-400 hover:to-teal-500 active:scale-[0.99] dark:from-teal-500 dark:to-emerald-600"
        >
          Register
        </button>
        <p className="text-center text-sm text-zinc-500">
          Have an account?{" "}
          <Link
            className="font-medium text-teal-700 underline decoration-teal-500/30 underline-offset-2 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
            href="/login"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
