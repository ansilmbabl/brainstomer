"use client";

import { useState, useCallback } from "react";

/** Same output on server and client (unlike default `toLocaleString()`). */
function formatModelTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

type ModelRow = { name: string; size?: number; modified_at?: string };

type Initial = {
  isOllama: boolean;
  envDefault: string;
  userOllamaModel: string | null;
  effectiveModel: string;
  models: ModelRow[];
  ollamaListError: string | null;
};

export function LlmSettingsClient({ initial }: { initial: Initial }) {
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setMessage("");
    const res = await fetch("/api/settings/llm");
    if (res.ok) {
      setState((await res.json()) as Initial);
    }
  }, []);

  async function saveOllamaModel(ollamaModel: string | null) {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings/llm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ollamaModel }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage(ollamaModel == null ? "Cleared. Using .env default." : "Saved.");
      await load();
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(j.error || "Save failed");
    }
  }

  if (!state.isOllama) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Model picker is for local Ollama. Set <code className="text-xs">LLM_PROVIDER=ollama</code>{" "}
        in <code className="text-xs">.env</code> and restart the app, then return here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {state.ollamaListError && (
        <p className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {state.ollamaListError}
        </p>
      )}
      <p className="text-xs text-zinc-500">
        Default from <code>OLLAMA_MODEL</code> in .env:{" "}
        <span className="font-mono">{state.envDefault}</span>
        {" · "}
        Active for you: <span className="font-mono text-zinc-800 dark:text-zinc-200">{state.effectiveModel}</span>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your Ollama model
          <select
            className="mt-1 w-full max-w-md rounded border border-zinc-200 bg-white px-2 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            value={state.userOllamaModel ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              void saveOllamaModel(v === "" ? null : v);
            }}
            disabled={saving}
          >
            <option value="">
              Use .env default ({state.envDefault})
            </option>
            {state.userOllamaModel &&
              !state.models.some((m) => m.name === state.userOllamaModel) && (
                <option value={state.userOllamaModel}>
                  {state.userOllamaModel} (not in current list)
                </option>
              )}
            {state.models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
                {m.size != null
                  ? ` (~${(m.size / 1e9).toFixed(1)} GB)`
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={load}
          className="shrink-0 rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
        >
          Refresh list
        </button>
      </div>
      {state.models.length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-200 text-xs dark:border-zinc-800">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-2 font-medium">Model</th>
                <th className="p-2 font-medium">Size</th>
                <th className="p-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {state.models.map((m) => (
                <tr
                  key={m.name}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="p-2 font-mono text-[11px] sm:text-xs">{m.name}</td>
                  <td className="p-2 text-zinc-500">
                    {m.size != null ? `${(m.size / 1e9).toFixed(2)} GB` : "—"}
                  </td>
                  <td className="p-2 text-zinc-500">
                    {m.modified_at ? formatModelTime(m.modified_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {message && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      )}
      <p className="text-xs text-zinc-500">
        Pull a new model in the terminal, then click <strong>Refresh list</strong> (e.g.{" "}
        <code className="text-[11px]">ollama pull qwen2.5:7b</code>).
      </p>
    </div>
  );
}
