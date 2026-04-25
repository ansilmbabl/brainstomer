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
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">LLM (Ollama)</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Choose which local model Brainstormer uses. Your choice is stored on your account and
        overrides <code className="text-xs">OLLAMA_BASE_URL</code> / <code className="text-xs">OLLAMA_MODEL</code> in{" "}
        <code className="text-xs">.env</code> for the model name only.
      </p>
      <div className="mt-6">
        <LlmSettingsClient initial={initial} />
      </div>
    </div>
  );
}
