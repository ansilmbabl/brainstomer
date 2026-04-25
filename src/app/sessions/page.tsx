import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NewSessionForm } from "@/components/NewSessionForm";

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
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Structured ideation toward technology and revenue—grounded with live search when configured.
      </p>
      <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-500">New session</h2>
        <div className="mt-3">
          <NewSessionForm />
        </div>
      </section>
      <ul className="mt-8 space-y-2">
        {list.map((s) => (
          <li key={s.id}>
            <Link
              href={`/sessions/${s.id}`}
              className="block rounded-md border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
            >
              <div className="font-medium">{s.title}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {s.mode.replace(/_/g, " ")} · {s.phase} ·{" "}
                {s.updatedAt.toLocaleString()}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">No sessions yet. Create one above.</p>
      )}
    </div>
  );
}
