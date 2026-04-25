"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

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
    <form onSubmit={onSubmit} className="max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}
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
        Password
        <input
          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Continue
      </button>
      <p className="text-sm text-zinc-500">
        New here? <Link className="underline" href="/register">Create an account</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
