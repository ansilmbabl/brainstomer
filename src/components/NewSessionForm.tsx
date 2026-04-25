"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const MODES = [
  { id: "OPPORTUNITY_SCAN", label: "Opportunity scan" },
  { id: "PRODUCT_TECH", label: "Product & tech" },
  { id: "BUSINESS_GTM", label: "Business & GTM" },
] as const;

export function NewSessionForm() {
  const r = useRouter();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("OPPORTUNITY_SCAN");
  const [region, setRegion] = useState("");
  const [industry, setIndustry] = useState("");
  const [researchMode, setResearchMode] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
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
    setLoading(false);
    if (!res.ok) return;
    const j = (await res.json()) as { session: { id: string } };
    r.push(`/sessions/${j.session.id}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="block min-w-[200px] flex-1 text-sm">
        Title
        <input
          className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Climate fintech ideas"
        />
      </label>
      <label className="block text-sm">
        Mode
        <select
          className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
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
      <label className="block text-sm">
        Region
        <input
          className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. EU"
        />
      </label>
      <label className="block text-sm">
        Industry
        <input
          className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g. Healthcare"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={researchMode}
          onChange={(e) => setResearchMode(e.target.checked)}
        />
        Research mode (more search)
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "…" : "Start"}
      </button>
    </form>
  );
}
