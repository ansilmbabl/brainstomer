/**
 * World-events → opportunity map: checklists, prompt templates, and localStorage keys
 * (OPPORTUNITY_SCAN / discover|focus in the app).
 */

export const RADAR_STORAGE_KEY = (sessionId: string) =>
  `brainstormer:opportunity-radar:${sessionId}` as const;
export const LAST_WEEKLY_SCAN_KEY = "brainstormer:last_weekly_scan" as const;

export type DiscoverCheckId =
  | "why_now"
  | "spaces"
  | "wedge"
  | "falsifier"
  | "payer";

export const DISCOVER_CHECKLIST: { id: DiscoverCheckId; label: string }[] = [
  {
    id: "why_now",
    label: "2–4 “why now” signals (with links if search is on)",
  },
  { id: "spaces", label: "At least 2 distinct opportunity spaces on the table" },
  { id: "wedge", label: "One wedge chosen to test first (1–2 sentences)" },
  { id: "falsifier", label: "What would prove this wrong in 2 weeks or less" },
  { id: "payer", label: "Roughly who would pay and for what outcome" },
];

export type FocusCheckId = "icp" | "outcome" | "status_quo";

export const FOCUS_CHECKLIST: { id: FocusCheckId; label: string }[] = [
  { id: "icp", label: "One ICP (buyer) in a single clear sentence" },
  { id: "outcome", label: "Outcome you sell vs a nice-to-have" },
  { id: "status_quo", label: "What people do today instead (substitute or workaround)" },
];

export function contextLine(
  focusIndustry: string | null,
  focusRegion: string | null,
): string {
  const ind = focusIndustry?.trim() || "the area in my title";
  const reg = focusRegion?.trim() || "relevant geographies";
  return `My focus: **${ind}** (${reg}). `;
}

export const DISCOVER_TEMPLATES: { label: string; build: (ctx: string) => string }[] = [
  {
    label: "Map signals → spaces",
    build: (ctx) =>
      `${ctx}From **today’s news and shifts** (use search with citations if available), give me: (1) 2–4 “why now” bullets, (2) 3 one-line **opportunity spaces** where a small team could play, (3) **one wedge** to explore first, (4) one **falsifiable** 2-week test. Use the headings **Signals**, **Spaces**, **Wedge**, **Falsifier**.`,
  },
  {
    label: "Revenue candidates",
    build: (ctx) =>
      `${ctx}List **3 ways money could move** in this space (who pays whom, and for what outcome). For each, one line on risk and why a tiny team could still win a slice. End with the single most plausible path for **early revenue**.`,
  },
  {
    label: "Regulatory / market shock",
    build: (ctx) =>
      `${ctx}What **regulatory, macro, or tech** shift in the last 12–18 months most changes odds here? Cite if you search. What **new** product or GTM is now possible that wasn’t before?`,
  },
  {
    label: "What would kill the bet",
    build: (ctx) =>
      `${ctx}Assume I’m wrong. List the **top 3 kill criteria** for a revenue bet in this space, and a **cheap test** for each. Be blunt.`,
  },
];

export const FOCUS_TEMPLATES: { label: string; build: (ctx: string) => string }[] = [
  {
    label: "Sharpen the problem",
    build: (ctx) =>
      `${ctx}We’re narrowing to **one** problem. Ask me up to 3 **multiple-choice** or yes/no questions, then state the **one problem** in a sharp sentence: who, when, what breaks, what they pay today (if anything).`,
  },
  {
    label: "Compare two wedges",
    build: (ctx) =>
      `${ctx}I’m between two focus directions. Help me list **A vs B**: buyer, time-to-revenue, competition, and **which to drop for now**. Be decisive.`,
  },
  {
    label: "First paying customer",
    build: (ctx) =>
      `${ctx}If I need **revenue in 90 days**, what’s the narrowest offer and **first channel** to one pilot customer? 5 bullets, no filler.`,
  },
];

export function loadRadarChecklist(
  sessionId: string,
  kind: "discover" | "focus",
): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(RADAR_STORAGE_KEY(sessionId));
    if (!raw) return {};
    const j = JSON.parse(raw) as {
      discover?: Record<string, boolean>;
      focus?: Record<string, boolean>;
    };
    return kind === "discover" ? (j.discover ?? {}) : (j.focus ?? {});
  } catch {
    return {};
  }
}

export function saveRadarChecklist(
  sessionId: string,
  kind: "discover" | "focus",
  map: Record<string, boolean>,
) {
  if (typeof window === "undefined") return;
  try {
    const key = RADAR_STORAGE_KEY(sessionId);
    const raw = localStorage.getItem(key);
    const j = (raw
      ? (JSON.parse(raw) as { discover?: Record<string, boolean>; focus?: Record<string, boolean> })
      : {}) as { discover?: Record<string, boolean>; focus?: Record<string, boolean> };
    if (kind === "discover") j.discover = map;
    else j.focus = map;
    localStorage.setItem(key, JSON.stringify(j));
  } catch {
    /* ignore quota */
  }
}

export function daysSinceLastWeeklyScan(): number | null {
  if (typeof window === "undefined") return null;
  const iso = localStorage.getItem(LAST_WEEKLY_SCAN_KEY);
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

export function touchLastWeeklyScan() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_WEEKLY_SCAN_KEY, new Date().toISOString());
    window.dispatchEvent(new Event("brainstormer-weekly"));
  } catch {
    /* ignore */
  }
}
