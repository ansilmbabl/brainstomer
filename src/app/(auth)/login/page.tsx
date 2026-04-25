"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

const field =
  "mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-zinc-100";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/sessions";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });
    if (r?.error) setErr("Sign-in failed");
    else if (r?.ok) router.push(callbackUrl);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-[400px] space-y-5 rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-lg shadow-zinc-900/5 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:shadow-black/20 sm:p-8"
    >
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Welcome back to Brainstormer.</p>
      </div>
      {err && (
        <p className="rounded-lg border border-red-200/80 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
          {err}
        </p>
      )}
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
        Password
        <input
          className={field}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-b from-teal-500 to-teal-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-500/20 transition hover:from-teal-400 hover:to-teal-500 active:scale-[0.99] dark:from-teal-500 dark:to-emerald-600"
      >
        Continue
      </button>
      <p className="text-center text-sm text-zinc-500">
        New here?{" "}
        <Link
          className="font-medium text-teal-700 underline decoration-teal-500/30 underline-offset-2 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
          href="/register"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center p-6">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-lg font-bold text-white shadow-md">
        B
      </div>
      <Suspense
        fallback={
          <div className="h-40 w-full max-w-[400px] animate-pulse rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/50" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
