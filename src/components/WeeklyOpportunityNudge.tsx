"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { daysSinceLastWeeklyScan } from "@/lib/opportunity-radar";

const DAYS_NUDGE = 7;

function subscribeNotify(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener("storage", h);
  window.addEventListener("brainstormer-weekly", h);
  return () => {
    window.removeEventListener("storage", h);
    window.removeEventListener("brainstormer-weekly", h);
  };
}

function getShouldNudge(): boolean {
  if (typeof window === "undefined") return false;
  const d = daysSinceLastWeeklyScan();
  if (d == null) return true;
  return d >= DAYS_NUDGE;
}

export function WeeklyOpportunityNudge() {
  const nudge = useSyncExternalStore(subscribeNotify, getShouldNudge, () => false);

  if (!nudge) return null;

  return (
    <div
      className="mb-6 rounded-2xl border border-dashed border-teal-300/60 bg-teal-50/40 p-4 dark:border-teal-500/30 dark:bg-teal-950/25 sm:p-5"
      suppressHydrationWarning
    >
      <p className="text-sm font-medium text-teal-900 dark:text-teal-200">
        Weekly world scan
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        Markets move fast. Run a short <strong>opportunity scan</strong> with research on,
        then use the <strong>radar checklist</strong> in discover phase to turn noise into
        a wedge to test.
      </p>
      <Link
        href="/sessions?weekly=1"
        className="mt-3 inline-flex items-center rounded-lg bg-gradient-to-b from-teal-500 to-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:from-teal-400 hover:to-teal-500"
      >
        Start weekly check-in
      </Link>
    </div>
  );
}
