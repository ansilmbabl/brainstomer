"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { phaseLabel } from "@/lib/phases";

type Msg = {
  id: string;
  role: string;
  content: string;
  citations: unknown;
};

type Initial = {
  id: string;
  title: string;
  mode: string;
  phase: string;
  researchMode: boolean;
  focusRegion: string | null;
  focusIndustry: string | null;
  scorecard: unknown;
  assumptions: unknown;
  artifactMd: string | null;
  messages: Msg[];
};

export function SessionWorkspace({ initial }: { initial: Initial }) {
  const r = useRouter();
  const [state, setState] = useState(initial);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sc, setSc] = useState(
    initial.scorecard && typeof initial.scorecard === "object"
      ? (initial.scorecard as Record<string, number | string>)
      : { impact: 3, feasibility: 3, timeToRevenue: 3, differentiation: 3 },
  );
  const [assumptions, setAssumptions] = useState(
    Array.isArray(initial.assumptions)
      ? (initial.assumptions as { text: string; howToTest: string }[])
      : [],
  );

  const refresh = useCallback(() => {
    r.refresh();
  }, [r]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    const text = input.trim();
    setInput("");
    const res = await fetch(`/api/idea-sessions/${state.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    if (res.ok) {
      const j = (await res.json()) as {
        reply: { content: string; citations: { title: string; url: string }[] };
        session: {
          scorecard: unknown;
          assumptions: unknown;
          artifactMd: string | null;
          phase: string;
        };
      };
      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            id: `u-${Date.now()}`,
            role: "user",
            content: text,
            citations: null,
          },
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: j.reply.content,
            citations: j.reply.citations,
          },
        ],
        phase: j.session.phase,
        artifactMd: j.session.artifactMd,
      }));
      if (j.session.scorecard)
        setSc(j.session.scorecard as typeof sc);
      if (j.session.assumptions && Array.isArray(j.session.assumptions))
        setAssumptions(j.session.assumptions as typeof assumptions);
    }
    setLoading(false);
    refresh();
  }

  async function saveConvergence() {
    await fetch(`/api/idea-sessions/${state.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scorecard: sc,
        assumptions,
      }),
    });
    refresh();
  }

  async function nextPhase() {
    const res = await fetch(`/api/idea-sessions/${state.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advance: true }),
    });
    if (res.ok) {
      const j = (await res.json()) as { session: { phase: string } };
      setState((s) => ({ ...s, phase: j.session.phase }));
      refresh();
    }
  }

  async function genArtifact() {
    setLoading(true);
    const res = await fetch(`/api/idea-sessions/${state.id}/artifact`, {
      method: "POST",
    });
    setLoading(false);
    if (res.ok) {
      const j = (await res.json()) as { session: { artifactMd: string | null } };
      setState((s) => ({ ...s, artifactMd: j.session.artifactMd }));
      refresh();
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 lg:flex-row">
      <div className="min-h-[60vh] flex-1 lg:min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link href="/sessions" className="hover:underline">
            ← Sessions
          </Link>
          <span>·</span>
          <span>{state.mode.replace(/_/g, " ")}</span>
          <span>·</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {state.phase}: {phaseLabel(state.phase)}
          </span>
        </div>
        <h1 className="text-xl font-semibold">{state.title}</h1>
        <p className="mt-1 text-xs text-zinc-500">
          {state.focusIndustry || "—"} · {state.focusRegion || "—"} · research{" "}
          {state.researchMode ? "on" : "off"}
        </p>
        <div className="mt-4 space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {state.messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-8 rounded-md bg-zinc-100 p-3 dark:bg-zinc-800"
                  : "mr-8 rounded-md border border-zinc-100 p-3 dark:border-zinc-800"
              }
            >
              <div className="text-xs uppercase text-zinc-400">{m.role}</div>
              <div className="prose prose-sm dark:prose-invert mt-1 max-w-none whitespace-pre-wrap">
                {m.content}
              </div>
              {Array.isArray(m.citations) &&
                (m.citations as { title?: string; url?: string }[]).length > 0 ? (
                  <ul className="mt-2 list-inside list-disc text-xs text-zinc-500">
                    {(m.citations as { title?: string; url?: string }[]).map((c, i) => (
                      <li key={i}>
                        <a href={c.url} className="underline" target="_blank" rel="noreferrer">
                          {c.title || c.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="mt-4 flex gap-2">
          <textarea
            className="min-h-[88px] flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What are you trying to figure out?"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="self-end rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "…" : "Send"}
          </button>
        </form>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={nextPhase}
            className="rounded border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-700"
          >
            Next phase
          </button>
          <button
            type="button"
            onClick={genArtifact}
            className="rounded border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-700"
            disabled={loading}
          >
            Generate one-pager
          </button>
          <a
            className="rounded border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-700"
            href={`/api/idea-sessions/${state.id}/export?format=md`}
          >
            Download .md
          </a>
          <a
            className="rounded border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-700"
            href={`/api/idea-sessions/${state.id}/export?format=handoff`}
          >
            Handoff JSON
          </a>
        </div>
        {state.artifactMd && (
          <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
            <div className="font-medium text-amber-900 dark:text-amber-200">One-pager draft</div>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">
              {state.artifactMd}
            </pre>
          </div>
        )}
      </div>
      <aside className="w-full shrink-0 space-y-4 lg:w-80">
        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium">Scorecard (1–5)</h2>
          {(["impact", "feasibility", "timeToRevenue", "differentiation"] as const).map(
            (k) => (
              <label key={k} className="mt-2 block text-xs capitalize text-zinc-600">
                {k}
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={Number(sc[k] ?? 3)}
                  onChange={(e) =>
                    setSc((o) => ({ ...o, [k]: Number(e.target.value) }))
                  }
                  className="w-full"
                />
              </label>
            ),
          )}
          <button
            type="button"
            onClick={saveConvergence}
            className="mt-3 w-full rounded bg-zinc-200 py-1 text-xs dark:bg-zinc-800"
          >
            Save scorecard
          </button>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium">Assumptions</h2>
          {assumptions.length === 0 && (
            <p className="text-xs text-zinc-500">The assistant can record these via the score phase.</p>
          )}
          {assumptions.map((a, i) => (
            <div key={i} className="mt-2 text-xs">
              <p>{a.text}</p>
              <p className="text-zinc-500">Test: {a.howToTest}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
