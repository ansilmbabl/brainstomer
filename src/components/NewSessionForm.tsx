"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { touchLastWeeklyScan } from "@/lib/opportunity-radar";

const MODES = [
  { id: "OPPORTUNITY_SCAN", label: "Opportunity scan", hint: "What is changing, where are the openings?" },
  { id: "PRODUCT_TECH", label: "Product & tech", hint: "Problem → build → how to validate" },
  { id: "BUSINESS_GTM", label: "Business & GTM", hint: "Who pays, pricing, and first channel" },
] as const;

const input =
  "mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:ring-teal-400/20";

function NewSessionFormInner() {
  const r = useRouter();
  const searchParams = useSearchParams();
  const isWeekly = searchParams.get("weekly") === "1";
  const [title, setTitle] = useState(() =>
    isWeekly
      ? `Weekly opportunity scan – ${new Date().toISOString().slice(0, 10)}`
      : "",
  );
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("OPPORTUNITY_SCAN");
  const [region, setRegion] = useState("");
  const [industry, setIndustry] = useState("");
  const [researchMode, setResearchMode] = useState(isWeekly);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modeInfo = MODES.find((m) => m.id === mode);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/idea-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Untitled brainstorm",
          mode,
          focusRegion: region || undefined,
          focusIndustry: industry || undefined,
          researchMode,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error || `Couldn’t start the session (${res.status}). Try again.`);
        return;
      }
      const j = (await res.json()) as { session: { id: string } };
      if (searchParams.get("weekly") === "1") {
        touchLastWeeklyScan();
      }
      r.push(`/sessions/${j.session.id}`);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" aria-describedby={error ? "new-session-error" : undefined}>
      {error && (
        <p
          id="new-session-error"
          className="rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2.5 text-sm text-red-900 dark:border-red-500/25 dark:bg-red-950/50 dark:text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Session title
          <input
            className={input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Climate fintech, EU, 2026"
            autoComplete="off"
          />
        </label>
        <label className="sm:col-span-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Path
          <select
            className={input}
            value={mode}
            onChange={(e) => setMode(e.target.value as (typeof MODES)[number]["id"])}
          >
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        {modeInfo && (
          <p className="sm:col-span-2 -mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            {modeInfo.hint}
          </p>
        )}
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Region
          <input
            className={input}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. EU, APAC, US"
            autoComplete="off"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Industry
          <input
            className={input}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. Healthcare, Fintech"
            autoComplete="off"
          />
        </label>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200/60 bg-zinc-50/80 p-3 dark:border-zinc-800/60 dark:bg-zinc-900/40">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500/30 dark:border-zinc-600 dark:bg-zinc-900"
          checked={researchMode}
          onChange={(e) => setResearchMode(e.target.checked)}
        />
        <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">Research mode</span> — more web search
          (uses Tavily; consider cost when on).
        </span>
      </label>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-w-[7rem] items-center justify-center rounded-xl bg-gradient-to-b from-teal-500 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-500/20 transition hover:from-teal-400 hover:to-teal-500 active:scale-[0.99] disabled:opacity-50 dark:from-teal-500 dark:to-emerald-600"
        >
          {loading ? "Starting…" : "Start session"}
        </button>
      </div>
    </form>
  );
}

export function NewSessionForm() {
  return (
    <Suspense
      fallback={
        <div
          className="h-40 animate-pulse rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/50"
          aria-hidden
        />
      }
    >
      <NewSessionFormInner />
    </Suspense>
  );
}
