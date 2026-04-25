import OpenAI, { APIError } from "openai";
import { prisma } from "@/lib/prisma";

export type LlmProvider = "openai" | "ollama";

export type ChatModelConfig = {
  client: OpenAI;
  model: string;
  provider: LlmProvider;
};

/**
 * Ensures the OpenAI-compatible URL ends with /v1 (Ollama’s compatibility layer).
 */
function ollamaBaseToOpenAiV1(url: string): string {
  const t = url.trim().replace(/\/$/, "");
  if (t.endsWith("/v1")) return t;
  return `${t}/v1`;
}

const DEFAULT_OLLAMA_MODEL = "llama3.2:latest";

/**
 * - `LLM_PROVIDER=ollama` — local Ollama, no `OPENAI_API_KEY` required.
 * - `LLM_PROVIDER=openai` or unset — use OpenAI; requires `OPENAI_API_KEY`.
 *
 * For Ollama, a value in `User.ollamaModel` overrides `OLLAMA_MODEL` from the environment.
 */
export async function getChatModel(
  userId?: string | null,
): Promise<ChatModelConfig | null> {
  const prov = process.env.LLM_PROVIDER?.toLowerCase();

  if (prov === "ollama") {
    const base = ollamaBaseToOpenAiV1(
      process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    );
    let model = process.env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
    if (userId) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { ollamaModel: true },
      });
      if (u?.ollamaModel?.trim()) {
        model = u.ollamaModel.trim();
      }
    }
    return {
      client: new OpenAI({ baseURL: base, apiKey: "ollama" }),
      model,
      provider: "ollama",
    };
  }

  if (prov === "openai" || !prov) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    return {
      client: new OpenAI({ apiKey: key }),
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      provider: "openai",
    };
  }

  return null;
}

export function missingLlmMessage(): string {
  return `Configure an LLM: either set \`LLM_PROVIDER=ollama\` and run Ollama locally, or set \`OPENAI_API_KEY\` (optionally with \`LLM_PROVIDER=openai\`). See .env.example.`;
}

/**
 * Ollama returns 404 if the model was never pulled or the name does not match `ollama list`.
 */
export function ollamaModelMissingMessage(requested: string): string {
  return [
    `Ollama does not have a model named \`${requested}\` (HTTP 404).`,
    "Install it and match the name in Settings → LLM or `OLLAMA_MODEL`, e.g.",
    "  ollama pull llama3.2",
    "Then pick the model in Settings or set `OLLAMA_MODEL=llama3.2:latest` in `.env`.",
  ].join("\n\n");
}

export function isOllamaModelNotFoundError(err: unknown): boolean {
  if (err instanceof APIError && err.status === 404) return true;
  const m = err instanceof Error ? err.message : String(err);
  if (/404|not found/i.test(m) && /model/i.test(m)) return true;
  return false;
}
