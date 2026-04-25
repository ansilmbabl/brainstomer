import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { SignOutButton } from "@/components/SignOutButton";

export function Shell({
  children,
  title = "Brainstormer",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white focus:shadow-lg dark:focus:bg-zinc-100 dark:focus:text-zinc-900"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/sessions"
            className="group flex items-center gap-2.5 font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-bold text-white shadow-sm ring-1 ring-teal-600/20 dark:from-teal-400 dark:to-emerald-500"
              aria-hidden
            >
              B
            </span>
            <span className="group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
              {title}
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <NavLinks />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 sm:py-8" tabIndex={-1}>
        {children}
      </main>
      <footer className="border-t border-zinc-200/60 py-4 text-center text-xs leading-relaxed text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-500">
        Not legal or investment advice. Verify any claims tied to the news or the web.
      </footer>
    </div>
  );
}
