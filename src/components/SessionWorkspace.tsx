"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageMarkdown } from "@/components/MessageMarkdown";
import { OpportunityRadarPanel } from "@/components/OpportunityRadarPanel";
import { nextPhase as getNextPhaseId, phaseLabel } from "@/lib/phases";
import { toIdeaMode } from "@/lib/modes";

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

const PENDING_USER_ID = "local-pending-user";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition active:scale-[0.99] disabled:opacity-50";
const btnSecondary =
  "border-zinc-200/90 bg-white/80 text-zinc-800 shadow-sm hover:border-teal-300/50 hover:bg-zinc-50 dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:border-teal-500/30 dark:hover:bg-zinc-800/50";
const btnPrimary =
  "border-transparent bg-gradient-to-b from-teal-500 to-teal-600 px-5 py-2.5 text-white shadow-md shadow-teal-500/20 hover:from-teal-400 hover:to-teal-500 dark:from-teal-500 dark:to-emerald-600 dark:hover:from-teal-400 dark:hover:to-emerald-500";

function ModeBadge({ mode }: { mode: string }) {
  const short = mode.replace(/_/g, " ");
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200/80 bg-zinc-50/90 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
      {short}
    </span>
  );
}

export function SessionWorkspace({ initial }: { initial: Initial }) {
  const r = useRouter();
  const [state, setState] = useState(initial);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [artifactPending, setArtifactPending] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [scoreSaving, setScoreSaving] = useState(false);
  const [scoreFeedback, setScoreFeedback] = useState<string | null>(null);
  const scoreFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const didMountScroll = useRef(false);

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

  const mode = toIdeaMode(state.mode);
  const canAdvancePhase = getNextPhaseId(mode, state.phase) != null;

  const refresh = useCallback(() => {
    r.refresh();
  }, [r]);

  useEffect(() => {
    if (!didMountScroll.current) {
      didMountScroll.current = true;
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages.length, sending]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(
    () => () => {
      if (scoreFeedbackTimer.current) clearTimeout(scoreFeedbackTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!appError) return;
    const t = setTimeout(() => setAppError(null), 8000);
    return () => clearTimeout(t);
  }, [appError]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setAppError(null);
    setInput("");
    setSending(true);
    setState((s) => ({
      ...s,
      messages: [
        ...s.messages,
        {
          id: PENDING_USER_ID,
          role: "user",
          content: text,
          citations: null,
        },
      ],
    }));
    try {
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
        setState((s) => {
          const without = s.messages.filter((m) => m.id !== PENDING_USER_ID);
          return {
            ...s,
            messages: [
              ...without,
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
          };
        });
        if (j.session.scorecard) setSc(j.session.scorecard as typeof sc);
        if (j.session.assumptions && Array.isArray(j.session.assumptions))
          setAssumptions(j.session.assumptions as typeof assumptions);
      } else {
        setState((s) => ({
          ...s,
          messages: s.messages.filter((m) => m.id !== PENDING_USER_ID),
        }));
        setInput(text);
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setAppError(
          j.error || `Message failed (${res.status}). Try again or shorten your text.`,
        );
      }
    } catch {
      setState((s) => ({
        ...s,
        messages: s.messages.filter((m) => m.id !== PENDING_USER_ID),
      }));
      setInput(text);
      setAppError("Network error. Check your connection and try again.");
    } finally {
      setSending(false);
      refresh();
    }
  }

  async function saveConvergence() {
    setAppError(null);
    setScoreFeedback(null);
    if (scoreFeedbackTimer.current) {
      clearTimeout(scoreFeedbackTimer.current);
      scoreFeedbackTimer.current = null;
    }
    setScoreSaving(true);
    try {
      const res = await fetch(`/api/idea-sessions/${state.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scorecard: sc, assumptions }),
      });
      if (res.ok) {
        setScoreFeedback("Scorecard saved.");
        scoreFeedbackTimer.current = setTimeout(() => setScoreFeedback(null), 4000);
        refresh();
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setAppError(j.error || "Couldn’t save scorecard.");
      }
    } catch {
      setAppError("Network error while saving. Try again.");
    } finally {
      setScoreSaving(false);
    }
  }

  async function handleAdvancePhase() {
    if (!canAdvancePhase) return;
    setAppError(null);
    const res = await fetch(`/api/idea-sessions/${state.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advance: true }),
    });
    if (res.ok) {
      const j = (await res.json()) as { session: { phase: string } };
      setState((s) => ({ ...s, phase: j.session.phase }));
      refresh();
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setAppError(j.error || "Couldn’t move to the next phase.");
    }
  }

  async function genArtifact() {
    if (artifactPending) return;
    setAppError(null);
    setArtifactPending(true);
    try {
      const res = await fetch(`/api/idea-sessions/${state.id}/artifact`, {
        method: "POST",
      });
      if (res.ok) {
        const j = (await res.json()) as { session: { artifactMd: string | null } };
        setState((s) => ({ ...s, artifactMd: j.session.artifactMd }));
        setScoreFeedback("One-pager updated below.");
        if (scoreFeedbackTimer.current) clearTimeout(scoreFeedbackTimer.current);
        scoreFeedbackTimer.current = setTimeout(() => setScoreFeedback(null), 5000);
        refresh();
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setAppError(j.error || "Couldn’t generate the one-pager. Try again.");
      }
    } catch {
      setAppError("Network error. Try again when you’re back online.");
    } finally {
      setArtifactPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8 lg:flex-row lg:items-start">
      {appError && (
        <div
          className="fixed bottom-4 left-1/2 z-50 w-[min(100%,24rem)] -translate-x-1/2 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-lg dark:border-red-500/30 dark:bg-red-950/90 dark:text-red-100"
          role="alert"
        >
          <div className="flex gap-2">
            <span className="flex-1 leading-snug">{appError}</span>
            <button
              type="button"
              className="shrink-0 text-xs font-medium underline underline-offset-2"
              onClick={() => setAppError(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="min-h-[50vh] min-w-0 flex-1">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/sessions"
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400/90 dark:hover:text-teal-300"
            >
              <span aria-hidden>←</span> All sessions
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                {state.title}
              </h1>
              <ModeBadge mode={state.mode} />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {state.phase}
              </span>
              <span className="text-zinc-400"> — </span>
              {phaseLabel(state.phase)}
            </p>
            <p className="mt-1.5 text-xs text-zinc-500">
              {state.focusIndustry || "Any industry"} · {state.focusRegion || "Any region"}{" "}
              <span className="text-zinc-400">·</span> Research{" "}
              {state.researchMode ? (
                <span className="font-medium text-teal-600 dark:text-teal-400">on</span>
              ) : (
                "off"
              )}
            </p>
          </div>
        </div>

        <OpportunityRadarPanel
          sessionId={state.id}
          mode={state.mode}
          phase={state.phase}
          focusRegion={state.focusRegion}
          focusIndustry={state.focusIndustry}
          onInsertTemplate={(text) => {
            setInput(text);
            setAppError(null);
            queueMicrotask(() => textareaRef.current?.focus());
          }}
        />

        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50/50 shadow-inner dark:border-zinc-800/80 dark:bg-zinc-900/30">
          <div
            className="max-h-[min(58vh,520px)] space-y-3 overflow-y-auto p-3 sm:p-4"
            role="log"
            aria-relevant="additions"
            aria-label="Chat messages"
          >
            {state.messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={isUser ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      isUser
                        ? "max-w-[min(100%,32rem)] rounded-2xl rounded-br-md border border-teal-200/60 bg-gradient-to-b from-teal-50 to-white px-4 py-3 text-[15px] leading-relaxed text-zinc-900 shadow-sm dark:border-teal-500/20 dark:from-teal-950/40 dark:to-zinc-900/90 dark:text-zinc-100"
                        : "max-w-[min(100%,32rem)] rounded-2xl rounded-bl-md border border-zinc-200/80 bg-white/95 px-4 py-3 text-[15px] leading-relaxed text-zinc-800 shadow-sm dark:border-zinc-700/60 dark:bg-zinc-900/80 dark:text-zinc-200"
                    }
                  >
                    <div
                      className={
                        isUser
                          ? "text-xs font-semibold uppercase tracking-wider text-teal-800/80 dark:text-teal-300/80"
                          : "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500"
                      }
                    >
                      {m.role}
                    </div>
                    {isUser ? (
                      <div className="mt-1.5 max-w-none whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {m.content}
                      </div>
                    ) : (
                      <MessageMarkdown className="mt-1.5 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                        {m.content}
                      </MessageMarkdown>
                    )}
                    {Array.isArray(m.citations) &&
                    (m.citations as { title?: string; url?: string }[]).length > 0 ? (
                      <ul className="mt-3 space-y-1 border-t border-zinc-200/60 pt-2 text-xs dark:border-zinc-700/60">
                        {(m.citations as { title?: string; url?: string }[]).map(
                          (c, i) => (
                            <li key={i}>
                              <a
                                href={c.url}
                                className="font-medium text-teal-600 underline decoration-teal-500/30 underline-offset-2 hover:decoration-teal-500 dark:text-teal-400"
                                target="_blank"
                                rel="noreferrer"
                              >
                                {c.title || c.url}
                              </a>
                            </li>
                          ),
                        )}
                      </ul>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start" aria-hidden>
                <div className="max-w-[min(100%,32rem)] rounded-2xl rounded-bl-md border border-zinc-200/80 bg-white/90 px-4 py-3 text-sm text-zinc-600 shadow-sm dark:border-zinc-700/60 dark:bg-zinc-900/90 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-2 w-2 animate-bounce rounded-full bg-teal-500"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="inline-flex h-2 w-2 animate-bounce rounded-full bg-teal-500"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="inline-flex h-2 w-2 animate-bounce rounded-full bg-teal-500"
                      style={{ animationDelay: "300ms" }}
                    />
                    <span className="ml-1 text-xs font-medium text-zinc-500">
                      Assistant is thinking
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={sendMessage}
          className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/90 p-2 shadow-lg shadow-zinc-900/5 dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:shadow-black/20"
        >
          <p className="px-2 pt-1 text-xs text-zinc-500 sm:px-2 sm:pt-0">
            <span className="sm:hidden">Use the send button. </span>
            <span className="hidden sm:inline text-zinc-500">
              <kbd className="rounded border border-zinc-200/80 bg-zinc-100 px-1.5 font-mono text-[10px] text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                ⌘/Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="rounded border border-zinc-200/80 bg-zinc-100 px-1.5 font-mono text-[10px] text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Enter
              </kbd>
              <span> to send</span>
              <span className="text-zinc-300 dark:text-zinc-600"> · </span>
            </span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-sm text-zinc-500">
              <span className="sr-only">Message</span>
              <textarea
                ref={textareaRef}
                className="min-h-[5.5rem] w-full resize-y rounded-xl border-0 bg-transparent px-3 py-2.5 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (!(e.metaKey || e.ctrlKey)) return;
                  e.preventDefault();
                  if (sending) return;
                  formRef.current?.requestSubmit();
                }}
                placeholder="What are you trying to figure out? Ask for recent context, push back, or go deeper on tech and revenue…"
                disabled={sending}
                rows={3}
              />
            </label>
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className={`shrink-0 self-stretch sm:self-end ${btnBase} ${btnPrimary} min-h-[2.75rem] sm:min-w-[7rem]`}
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 shrink-0 animate-pulse rounded-full bg-white/50"
                    aria-hidden
                  />
                  Sending…
                </span>
              ) : (
                "Send"
              )}
            </button>
          </div>
        </form>

        {scoreFeedback && !appError && (
          <p
            className="mt-2 text-sm font-medium text-teal-700 dark:text-teal-400/90"
            role="status"
            aria-live="polite"
          >
            {scoreFeedback}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAdvancePhase}
            disabled={!canAdvancePhase}
            title={
              canAdvancePhase
                ? "Move to the next step in this session"
                : "You’re already on the last phase. Generate a one-pager or continue in chat."
            }
            className={`${btnBase} ${btnSecondary} px-3 py-2`}
          >
            Next phase
          </button>
          <button
            type="button"
            onClick={genArtifact}
            disabled={sending || artifactPending}
            className={`${btnBase} ${btnSecondary} px-3 py-2`}
          >
            {artifactPending ? "Generating…" : "Generate one-pager"}
          </button>
          <a
            className={`${btnBase} ${btnSecondary} px-3 py-2`}
            href={`/api/idea-sessions/${state.id}/export?format=md`}
            download
          >
            Download .md
          </a>
          <a
            className={`${btnBase} ${btnSecondary} px-3 py-2`}
            href={`/api/idea-sessions/${state.id}/export?format=handoff`}
            download
          >
            Handoff JSON
          </a>
        </div>

        {state.artifactMd && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-amber-50/30 p-4 dark:border-amber-500/20 dark:from-amber-950/50 dark:to-zinc-900/30">
            <div className="text-sm font-semibold text-amber-950 dark:text-amber-200/90">
              One-pager draft
            </div>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-amber-950/90 dark:text-amber-100/80">
              {state.artifactMd}
            </pre>
          </div>
        )}
      </div>

      <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-24 lg:max-w-sm lg:pl-2">
        <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Scorecard{" "}
            <span className="font-normal text-zinc-500">(1–5)</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Use the sliders, then save. Doesn’t auto-save to avoid accidental edits.
          </p>
          {(["impact", "feasibility", "timeToRevenue", "differentiation"] as const).map(
            (k) => (
              <label
                key={k}
                className="mt-3 block text-xs font-medium capitalize text-zinc-600 dark:text-zinc-400"
              >
                {k.replace(/([A-Z])/g, " $1").trim()}
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={Number(sc[k] ?? 3)}
                  onChange={(e) =>
                    setSc((o) => ({ ...o, [k]: Number(e.target.value) }))
                  }
                  className="mt-1.5 w-full accent-teal-600 dark:accent-teal-500"
                />
              </label>
            ),
          )}
          <button
            type="button"
            onClick={saveConvergence}
            disabled={scoreSaving}
            className={`${btnBase} ${btnPrimary} mt-4 w-full py-2.5 text-sm`}
          >
            {scoreSaving ? "Saving…" : "Save scorecard"}
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Assumptions
          </h2>
          {assumptions.length === 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              The assistant can add these in the <strong>score</strong> phase, or
              you can discuss them in chat.
            </p>
          ) : (
            <ul className="mt-2 space-y-3">
              {assumptions.map((a, i) => (
                <li
                  key={i}
                  className="border-l-2 border-teal-500/50 pl-3 text-sm leading-relaxed"
                >
                  <p className="text-zinc-800 dark:text-zinc-200">{a.text}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-600 dark:text-zinc-500">
                      Test:{" "}
                    </span>
                    {a.howToTest}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
