"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200"
    >
      Sign out
    </button>
  );
}
