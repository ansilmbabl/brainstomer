"use client";

import { useLayoutEffect, useState } from "react";
import {
  DISCOVER_CHECKLIST,
  DISCOVER_TEMPLATES,
  FOCUS_CHECKLIST,
  FOCUS_TEMPLATES,
  contextLine,
  loadRadarChecklist,
  saveRadarChecklist,
} from "@/lib/opportunity-radar";

const chip =
  "rounded-lg border border-teal-200/80 bg-white/90 px-2.5 py-1.5 text-left text-xs font-medium text-teal-900 transition hover:border-teal-400/50 hover:bg-teal-50/90 dark:border-teal-500/20 dark:bg-teal-950/30 dark:text-teal-100 dark:hover:bg-teal-950/50";

type Props = {
  sessionId: string;
  mode: string;
  phase: string;
  focusRegion: string | null;
  focusIndustry: string | null;
  onInsertTemplate: (fullMessage: string) => void;
};

export function OpportunityRadarPanel({
  sessionId,
  mode,
  phase,
  focusRegion,
  focusIndustry,
  onInsertTemplate,
}: Props) {
  const isRadar = mode === "OPPORTUNITY_SCAN" && (phase === "discover" || phase === "focus");
  const kind = phase === "discover" ? "discover" : "focus";
  const list = phase === "discover" ? DISCOVER_CHECKLIST : FOCUS_CHECKLIST;
  const templates = phase === "discover" ? DISCOVER_TEMPLATES : FOCUS_TEMPLATES;

  const [checks, setChecks] = useState<Record<string, boolean>>({});

  // Sync from localStorage after mount; cannot read window during SSR/initial useState.
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!isRadar) return;
    setChecks(loadRadarChecklist(sessionId, kind));
  }, [isRadar, sessionId, kind]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const line = contextLine(focusIndustry, focusRegion);

  const toggle = (id: string) => {
    if (!isRadar) return;
    setChecks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveRadarChecklist(sessionId, kind, next);
      return next;
    });
  };

  if (!isRadar) return null;

  const n = list.length;
  const done = list.filter((x) => checks[x.id]).length;

  return (
    <section
      className="mb-4 rounded-2xl border border-teal-200/60 bg-gradient-to-b from-teal-50/90 to-white/80 p-4 shadow-sm dark:border-teal-500/20 dark:from-teal-950/40 dark:to-zinc-900/40 sm:p-5"
      aria-labelledby="opportunity-radar-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2
          id="opportunity-radar-heading"
          className="text-sm font-semibold text-teal-900 dark:text-teal-200"
        >
          {phase === "discover" ? "Opportunity radar" : "Focus — narrow the space"}
        </h2>
        <p className="text-xs text-teal-700/80 dark:text-teal-400/80">
          {done}/{n} checklist
        </p>
      </div>
      {phase === "discover" ? (
        <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Turn <strong>what’s changing in the world</strong> into a <strong>revenue-worthy
          bet</strong>: signals → a few spaces → one wedge to test. Use{" "}
          <strong>Research mode</strong> (Tavily) for recent citations.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Pick <strong>one</strong> sharp problem and buyer. Then you’ll move to score and
          one-pager.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {list.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              id={`radar-${sessionId}-${item.id}`}
              checked={Boolean(checks[item.id])}
              onChange={() => toggle(item.id)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-teal-600 focus:ring-teal-500/30 dark:border-zinc-600"
            />
            <label
              htmlFor={`radar-${sessionId}-${item.id}`}
              className="text-xs leading-snug text-zinc-700 dark:text-zinc-300"
            >
              {item.label}
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Starter prompts
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {templates.map((t) => (
            <button
              key={t.label}
              type="button"
              className={chip}
              onClick={() => onInsertTemplate(t.build(line))}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          Fills the composer; press Send. Edit before sending if you like.
        </p>
      </div>
    </section>
  );
}
