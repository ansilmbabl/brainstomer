/**
 * Fetches local models from Ollama’s HTTP API (not the OpenAI-compatible /v1 layer).
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md#list-local-models
 */
export type OllamaModelTag = {
  name: string;
  size?: number;
  modified_at?: string;
  digest?: string;
};

function ollamaBaseHttp(): string {
  return (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434")
    .trim()
    .replace(/\/$/, "")
    .replace(/\/v1$/, "");
}

export async function fetchOllamaModelTags(): Promise<{
  models: OllamaModelTag[];
  error?: string;
}> {
  const base = ollamaBaseHttp();
  const url = `${base}/api/tags`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      return { models: [], error: `Ollama returned ${res.status} at ${url}` };
    }
    const data = (await res.json()) as {
      models?: {
        name: string;
        size?: number;
        modified_at?: string;
        digest?: string;
      }[];
    };
    const models = (data.models ?? [])
      .map((m) => ({
        name: m.name,
        size: m.size,
        modified_at: m.modified_at,
        digest: m.digest,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { models };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      models: [],
      error: `Could not reach Ollama at ${base}. Is \`ollama serve\` running? (${msg})`,
    };
  }
}
