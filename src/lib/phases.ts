import type { IdeaMode } from "@/lib/modes";

export type PhaseId = (typeof PHASES)[IdeaMode][number];

const OPPORTUNITY = ["discover", "focus", "score", "one_pager"] as const;
const PRODUCT = ["problem", "solution", "technical", "score", "one_pager"] as const;
const BUSINESS = ["icp", "pricing_gtm", "score", "one_pager"] as const;

export const PHASES: Record<IdeaMode, readonly string[]> = {
  OPPORTUNITY_SCAN: OPPORTUNITY,
  PRODUCT_TECH: PRODUCT,
  BUSINESS_GTM: BUSINESS,
} as const;

const LABELS: Record<string, string> = {
  discover: "Discover — what is changing in the world & where are openings?",
  focus: "Focus — pick one problem space to go deep",
  score: "Score — impact, feasibility, time-to-revenue, differentiation",
  one_pager: "One-pager — lock the opportunity brief",

  problem: "Problem — who hurts and what breaks today?",
  solution: "Solution — what you could build and why you",
  technical: "Technical — approach, stack options, what to validate first",

  icp: "ICP & value — who pays and for what outcome?",
  pricing_gtm: "Pricing & GTM — how money moves, first channel",
};

export function phaseLabel(phase: string): string {
  return LABELS[phase] ?? phase;
}

export function firstPhase(mode: IdeaMode): PhaseId {
  return PHASES[mode][0] as PhaseId;
}

export function nextPhase(
  mode: IdeaMode,
  current: string,
): PhaseId | null {
  const list = [...PHASES[mode]] as string[];
  const i = list.indexOf(current);
  if (i < 0 || i >= list.length - 1) return null;
  return list[i + 1] as PhaseId;
}

export function isValidPhase(mode: IdeaMode, phase: string): boolean {
  return (PHASES[mode] as readonly string[]).includes(phase);
}

export function systemAddendumForPhase(mode: IdeaMode, phase: string): string {
  const base = `Session mode: ${mode}. Current phase: ${phase} (${phaseLabel(phase)}). 
Stay in this phase unless the user explicitly asks to move on. Gently nudge toward tech creation and/or revenue, grounded in what is realistic for a small team.`;

  if (mode === "OPPORTUNITY_SCAN") {
    if (phase === "discover")
      return (
        base +
        ` Frame answers as a compact **opportunity map** (use these Markdown section headings in order: ## Signals, ## Candidate spaces, ## Wedge, ## Falsifier, then ## Follow-up). 
Under **Signals** give 2–4 “why now” facts/trends, with **links or source titles** if search is used; if not searching, be explicit. 
Under **Candidate spaces** list 2–3 distinct “where we could play” one-liners aimed at **revenue for a small team**. 
**Wedge** = the single bet to test first. **Falsifier** = the cheapest 1–2 week test that disproves the wedge. 
End with one **Follow-up** question. Stay concise.`
      );
    if (phase === "focus")
      return (
        base +
        ` The user is narrowing a **single** problem. Ask tight questions; then state one **problem sentence** (who, pain, who pays) and an **anti-problem** (what we are NOT solving). 
Push toward a **pilot** someone would pay for.`
      );
  }
  if (mode === "PRODUCT_TECH" && phase === "technical") {
    return (
      base +
      ` Propose 1–2 architecture options, name tradeoffs, and a minimal validation plan (1–2 weeks).`
    );
  }
  if (mode === "BUSINESS_GTM" && phase === "pricing_gtm") {
    return (
      base +
      ` Be explicit about pricing hypothesis, first channel, and a falsifiable GTM test.`
    );
  }
  if (phase === "score") {
    return (
      base +
      ` Use the record_convergence tool to save scorecard 1–5; list top assumptions and a cheap test for each.`
    );
  }
  if (phase === "one_pager") {
    return (
      base +
      ` Synthesize: problem, why now, proposed solution, revenue model, 30-day plan. Offer to refine bullets.`
    );
  }
  return base;
}
