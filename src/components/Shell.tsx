import Link from "next/link";
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
      <header className="flex h-12 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <Link href="/sessions" className="font-medium tracking-tight">
          {title}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link className="text-zinc-600 hover:underline dark:text-zinc-400" href="/sessions">
            Sessions
          </Link>
          <Link
            className="text-zinc-600 hover:underline dark:text-zinc-400"
            href="/settings/integrations"
          >
            Integrations
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 py-2 text-center text-xs text-zinc-500 dark:border-zinc-800">
        Not legal or investment advice. Verify any claims tied to the news or the web.
      </footer>
    </div>
  );
}
