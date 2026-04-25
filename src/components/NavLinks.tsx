"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/sessions", label: "Sessions" },
  { href: "/settings/llm", label: "LLM" },
  { href: "/settings/integrations", label: "Integrations" },
] as const;

const idle =
  "rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100";
const active =
  "rounded-lg bg-teal-100/80 px-3 py-1.5 text-sm font-semibold text-teal-900 ring-1 ring-teal-200/50 dark:bg-teal-950/50 dark:text-teal-200 dark:ring-teal-500/20";

function isActive(pathname: string | null, href: (typeof items)[number]["href"]): boolean {
  if (!pathname) return false;
  if (href === "/sessions") {
    return pathname === "/sessions" || pathname.startsWith("/sessions/");
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2"
      aria-label="Main"
    >
      {items.map((item) => {
        const on = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={on ? active : idle}
            aria-current={on ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
