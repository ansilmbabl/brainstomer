import type { IdeaMessage, IdeaSession } from "@prisma/client";
import { phaseLabel } from "@/lib/phases";

const HANDOFF_VERSION = "1.0" as const;

export type HandoffV1 = {
  handoffVersion: "1.0";
  exportedAt: string;
  session: {
    id: string;
    title: string;
    mode: string;
    phase: string;
    phaseLabel: string;
    focusRegion: string | null;
    focusIndustry: string | null;
    researchMode: boolean;
  };
  scorecard: unknown;
  assumptions: unknown;
  messages: { role: string; content: string; createdAt: string }[];
  artifactMd: string | null;
  openQuestions: string[];
};

function parseStoredJson(s: string | null): unknown {
  if (s == null || s === "") return null;
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return s;
  }
}

/**
 * Interoperability bundle for other agents (see public/schemas/handoff-v1.json).
 */
export function buildHandoff(
  s: IdeaSession,
  messages: Pick<IdeaMessage, "role" | "content" | "createdAt">[],
  openQuestions: string[] = [],
): HandoffV1 {
  return {
    handoffVersion: HANDOFF_VERSION,
    exportedAt: new Date().toISOString(),
    session: {
      id: s.id,
      title: s.title,
      mode: s.mode,
      phase: s.phase,
      phaseLabel: phaseLabel(s.phase),
      focusRegion: s.focusRegion,
      focusIndustry: s.focusIndustry,
      researchMode: s.researchMode,
    },
    scorecard: parseStoredJson(s.scorecard),
    assumptions: parseStoredJson(s.assumptions),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
    artifactMd: s.artifactMd,
    openQuestions,
  };
}
