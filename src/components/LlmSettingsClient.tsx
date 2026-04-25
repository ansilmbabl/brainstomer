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
      <p className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-400">
        Model picker is for local Ollama. Set <code className="rounded bg-zinc-200/80 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">LLM_PROVIDER=ollama</code>{" "}
        in <code className="rounded bg-zinc-200/80 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">.env</code> and restart the app, then return here.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {state.ollamaListError && (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3 text-sm text-amber-950 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-200/90">
          {state.ollamaListError}
        </p>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Default from <code className="font-mono text-xs text-zinc-800 dark:text-zinc-200">OLLAMA_MODEL</code> in .env:{" "}
        <span className="font-mono text-teal-800 dark:text-teal-300">{state.envDefault}</span>
        <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
        Active: <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{state.effectiveModel}</span>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Your Ollama model
          <select
            className="mt-1.5 w-full max-w-md rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-zinc-100"
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
          className="shrink-0 rounded-xl border border-zinc-200/90 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-teal-300/50 hover:bg-zinc-50 dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:border-teal-500/30"
        >
          Refresh list
        </button>
      </div>
      {state.models.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white/50 text-xs dark:border-zinc-800/80 dark:bg-zinc-900/30">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200/80 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Model
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Size
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {state.models.map((m) => (
                <tr
                  key={m.name}
                  className="border-b border-zinc-100/80 last:border-0 dark:border-zinc-800/60"
                >
                  <td className="p-3 font-mono text-[11px] text-zinc-900 sm:text-xs dark:text-zinc-200">
                    {m.name}
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">
                    {m.size != null ? `${(m.size / 1e9).toFixed(2)} GB` : "—"}
                  </td>
                  <td className="p-3 text-zinc-500 tabular-nums">
                    {m.modified_at ? formatModelTime(m.modified_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {message && (
        <p className="text-sm text-teal-800 dark:text-teal-300/90">{message}</p>
      )}
      <p className="text-xs leading-relaxed text-zinc-500">
        Pull a new model in the terminal, then click <strong>Refresh list</strong> (e.g.{" "}
        <code className="rounded bg-zinc-200/60 px-1.5 py-0.5 font-mono text-[11px] dark:bg-zinc-800">ollama pull qwen2.5:7b</code>).
      </p>
    </div>
  );
}
