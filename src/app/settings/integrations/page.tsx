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
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Integrations</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Use API keys and webhooks to connect other agents. REST base:{" "}
        <code className="text-xs">/api/idea-sessions</code> with{" "}
        <code className="text-xs">Authorization: Bearer bsk_…</code>
        . Handoff JSON:{" "}
        <a className="underline" href="/schemas/handoff-v1.json">
          schema
        </a>
        .
      </p>
      <IntegrationsClient initialKeys={initialKeys} />
    </div>
  );
}
