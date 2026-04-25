import { IntegrationsClient } from "@/components/IntegrationsClient";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function IntegrationsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const initialKeys = userId
    ? await prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true },
      })
    : [];
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Integrations &amp; API
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Call the same session API as the app. Base path{" "}
        <code className="rounded bg-zinc-200/50 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">
          /api/idea-sessions
        </code>{" "}
        with a bearer key.{" "}
        <a
          className="font-medium text-teal-700 underline decoration-teal-500/30 underline-offset-2 hover:text-teal-800 dark:text-teal-400"
          href="/schemas/handoff-v1.json"
        >
          Handoff JSON schema
        </a>
        .
      </p>
      <IntegrationsClient initialKeys={initialKeys} />
    </div>
  );
}
