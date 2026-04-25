"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-zinc-600 hover:underline dark:text-zinc-400"
    >
      Sign out
    </button>
  );
}
