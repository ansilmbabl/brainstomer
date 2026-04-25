import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NewSessionForm } from "@/components/NewSessionForm";
import { WeeklyOpportunityNudge } from "@/components/WeeklyOpportunityNudge";
import { formatDateTimeUtc } from "@/lib/format-date";

export default async function SessionsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  const list = userId
    ? await prisma.ideaSession.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 40,
        select: {
          id: true,
          title: true,
          mode: true,
          phase: true,
          updatedAt: true,
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Your sessions
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Use <strong>Opportunity scan</strong> to turn what’s moving in the world into a
          focused revenue bet: a <strong>radar checklist</strong> and starter prompts in
          discover, plus optional live search when Tavily is set up.
        </p>
      </div>

      <WeeklyOpportunityNudge />

      <section className="mb-10 rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Start a new brainstorm
        </h2>
        <p className="mb-4 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Choose a path: scan opportunities, shape product and tech, or focus on
          GTM and pricing.
        </p>
        <NewSessionForm />
      </section>

      {list.length > 0 ? (
        <ul className="space-y-3">
          {list.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sessions/${s.id}`}
                className="group block rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300/50 hover:shadow-md hover:shadow-teal-500/5 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:hover:border-teal-500/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-zinc-900 group-hover:text-teal-800 dark:text-zinc-100 dark:group-hover:text-teal-300">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-zinc-500">
                      {s.mode.replace(/_/g, " ")} · {s.phase}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-xs text-zinc-400 tabular-nums dark:text-zinc-500"
                    dateTime={s.updatedAt.toISOString()}
                  >
                    {formatDateTimeUtc(s.updatedAt)}
                  </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-300/80 bg-zinc-50/50 p-8 text-center dark:border-zinc-700/80 dark:bg-zinc-900/30">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No sessions yet. Create one with the form above to begin.
          </p>
        </div>
      )}
    </div>
  );
}
