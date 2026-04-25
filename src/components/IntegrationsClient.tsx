"use client";

import { useState } from "react";

const EVENTS = [
  "session.created",
  "session.updated",
  "session.phase_changed",
  "message.created",
  "artifact.published",
] as const;

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

  async function load() {
    const k = await fetch("/api/api-keys");
    if (k.ok) {
      const j = (await k.json()) as { keys: { id: string; name: string }[] };
      setKeys(j.keys);
    }
  }

  async function createKey() {
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const j = (await res.json()) as { token: string };
      setNewKey(j.token);
      await load();
    }
  }

  async function addWebhook() {
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: wUrl, events: [...EVENTS] }),
    });
    if (res.ok) {
      const j = (await res.json()) as { secret: string };
      setHookSecret(j.secret);
      setWUrl("");
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <section>
        <h2 className="text-sm font-medium uppercase text-zinc-500">API keys</h2>
        {newKey && (
          <p className="mt-2 break-all rounded bg-amber-100 p-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            New key (copy now): {newKey}
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded border border-zinc-200 px-2 py-1 dark:border-zinc-800"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key label"
          />
          <button
            type="button"
            onClick={createKey}
            className="rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Create
          </button>
        </div>
        <ul className="mt-2 text-xs text-zinc-500">
          {keys.map((k) => (
            <li key={k.id}>
              {k.name} <span className="text-zinc-400">({k.id})</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-medium uppercase text-zinc-500">Webhooks</h2>
        {hookSecret && (
          <p className="mt-2 break-all rounded bg-amber-100 p-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            Webhook secret (for HMAC verify): {hookSecret}
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded border border-zinc-200 px-2 py-1 dark:border-zinc-800"
            value={wUrl}
            onChange={(e) => setWUrl(e.target.value)}
            placeholder="https://…"
          />
          <button
            type="button"
            onClick={addWebhook}
            className="rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Receives all event types. Signature header: X-Brainstormer-Signature: sha256=hex
        </p>
      </section>
    </div>
  );
}
