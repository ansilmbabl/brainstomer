import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LlmSettingsClient } from "@/components/LlmSettingsClient";
import { fetchOllamaModelTags } from "@/lib/ollama-list";

const DEFAULT_OLLAMA_MODEL = "llama3.2:latest";

export default async function LlmSettingsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const prov = process.env.LLM_PROVIDER?.toLowerCase();
  const isOllama = prov === "ollama";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ollamaModel: true },
  });
  const envDefault = process.env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
  const userOllamaModel = user?.ollamaModel ?? null;
  const effectiveModel = userOllamaModel?.trim() || envDefault;
  const { models, error: ollamaListError } = isOllama
    ? await fetchOllamaModelTags()
    : { models: [], error: undefined };

  const initial = {
    isOllama,
    envDefault,
    userOllamaModel,
    effectiveModel,
    models,
    ollamaListError: ollamaListError ?? null,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Local models
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        When <code className="rounded bg-zinc-200/50 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">LLM_PROVIDER=ollama</code>, pick which model to use. Your choice
        is saved to your account and overrides the <code className="text-xs">OLLAMA_MODEL</code> default from{" "}
        <code className="text-xs">.env</code>.
      </p>
      <div className="mt-6 rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 sm:p-6">
        <LlmSettingsClient initial={initial} />
      </div>
    </div>
  );
}
