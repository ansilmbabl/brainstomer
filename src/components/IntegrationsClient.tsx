"use client";

import { useState, useCallback } from "react";

const EVENTS = [
  "session.created",
  "session.updated",
  "session.phase_changed",
  "message.created",
  "artifact.published",
] as const;

const input =
  "flex-1 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-zinc-100";
const btn =
  "inline-flex shrink-0 items-center justify-center rounded-xl border border-zinc-200/90 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";

export function IntegrationsClient({
  initialKeys,
}: {
  initialKeys: { id: string; name: string }[];
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [hookSecret, setHookSecret] = useState<string | null>(null);
  const [name, setName] = useState("agent");
  const [wUrl, setWUrl] = useState("");
  const [keyLoading, setKeyLoading] = useState(false);
  const [hookLoading, setHookLoading] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [hookError, setHookError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [copySecretDone, setCopySecretDone] = useState(false);

  const load = useCallback(async () => {
    const k = await fetch("/api/api-keys");
    if (k.ok) {
      const j = (await k.json()) as { keys: { id: string; name: string }[] };
      setKeys(j.keys);
    }
  }, []);

  async function createKey() {
    setKeyError(null);
    setKeyLoading(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const j = (await res.json()) as { token: string };
        setNewKey(j.token);
        await load();
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setKeyError(j.error || `Create failed (${res.status}). Try again.`);
      }
    } catch {
      setKeyError("Network error. Try again when you’re online.");
    } finally {
      setKeyLoading(false);
    }
  }

  async function addWebhook() {
    setHookError(null);
    if (!wUrl.trim()) {
      setHookError("Enter a full URL, including https://");
      return;
    }
    setHookLoading(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: wUrl.trim(), events: [...EVENTS] }),
      });
      if (res.ok) {
        const j = (await res.json()) as { secret: string };
        setHookSecret(j.secret);
        setWUrl("");
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setHookError(j.error || `Couldn’t add webhook (${res.status}).`);
      }
    } catch {
      setHookError("Network error. Try again.");
    } finally {
      setHookLoading(false);
    }
  }

  async function copyToClipboard(
    value: string,
    which: "token" | "secret",
  ) {
    try {
      await navigator.clipboard.writeText(value);
      if (which === "token") {
        setCopyDone(true);
        setTimeout(() => setCopyDone(false), 2000);
      } else {
        setCopySecretDone(true);
        setTimeout(() => setCopySecretDone(false), 2000);
      }
    } catch {
      const msg = "Couldn’t copy. Select the text and copy manually.";
      if (which === "token") setKeyError(msg);
      else setHookError(msg);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          API keys
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Use with <code className="text-xs">Authorization: Bearer bsk_…</code> for scripts and
          other agents.
        </p>
        {keyError && (
          <p className="mt-3 rounded-xl border border-red-200/80 bg-red-50/90 p-2.5 text-xs text-red-900 dark:border-red-500/25 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {keyError}
          </p>
        )}
        {newKey && (
          <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/90 p-3 text-xs text-amber-950 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-semibold">Copy now — this won’t be shown again:</p>
            <p className="mt-1.5 break-all font-mono">{newKey}</p>
            <button
              type="button"
              onClick={() => copyToClipboard(newKey, "token")}
              className="mt-2 rounded-lg border border-amber-300/80 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-amber-950 shadow-sm hover:bg-amber-100/80 dark:border-amber-500/30 dark:bg-zinc-900/80 dark:text-amber-100 dark:hover:bg-amber-950/50"
            >
              {copyDone ? "Copied" : "Copy to clipboard"}
            </button>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key label (e.g. n8n, CI)"
            disabled={keyLoading}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={createKey}
            disabled={keyLoading || !name.trim()}
            className={btn}
          >
            {keyLoading ? "Creating…" : "Create"}
          </button>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          {keys.length === 0 && (
            <li className="text-zinc-500">No keys yet.</li>
          )}
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100/80 bg-zinc-50/50 px-3 py-2 text-xs dark:border-zinc-800/60 dark:bg-zinc-900/30"
            >
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{k.name}</span>
              <code className="shrink-0 text-zinc-500">{k.id}</code>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Webhooks
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          HMAC in header <code className="text-xs">X-Brainstormer-Signature: sha256=…</code>
        </p>
        {hookError && (
          <p className="mt-3 rounded-xl border border-red-200/80 bg-red-50/90 p-2.5 text-xs text-red-900 dark:border-red-500/25 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {hookError}
          </p>
        )}
        {hookSecret && (
          <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/90 p-3 text-xs text-amber-950 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-semibold">Store this secret for HMAC verification:</p>
            <p className="mt-1.5 break-all font-mono">{hookSecret}</p>
            <button
              type="button"
              onClick={() => copyToClipboard(hookSecret, "secret")}
              className="mt-2 rounded-lg border border-amber-300/80 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-amber-950 shadow-sm hover:bg-amber-100/80 dark:border-amber-500/30 dark:bg-zinc-900/80 dark:text-amber-100 dark:hover:bg-amber-950/50"
            >
              {copySecretDone ? "Copied" : "Copy to clipboard"}
            </button>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className={input}
            value={wUrl}
            onChange={(e) => setWUrl(e.target.value)}
            placeholder="https://your-endpoint/…"
            type="url"
            disabled={hookLoading}
            inputMode="url"
            autoComplete="url"
          />
          <button
            type="button"
            onClick={addWebhook}
            disabled={hookLoading}
            className={btn}
          >
            {hookLoading ? "Adding…" : "Add"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Receives: {EVENTS.join(", ")}.
        </p>
      </section>
    </div>
  );
}
