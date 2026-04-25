import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, HttpError } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { isValidPhase, nextPhase } from "@/lib/phases";
import { toIdeaMode } from "@/lib/modes";
import { dispatchWebhooks } from "@/lib/webhooks";

const patchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  focusRegion: z.string().max(100).nullable().optional(),
  focusIndustry: z.string().max(100).nullable().optional(),
  researchMode: z.boolean().optional(),
  phase: z.string().optional(),
  scorecard: z.unknown().optional(),
  assumptions: z.unknown().optional(),
  /** jump to next phase in order */
  advance: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId(_req);
    const { id } = await ctx.params;
    const s = await prisma.ideaSession.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!s) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ session: s });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId(req);
    const { id } = await ctx.params;
    const s0 = await prisma.ideaSession.findFirst({ where: { id, userId } });
    if (!s0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const json = await req.json().catch(() => null);
    const parsed = patchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const b = parsed.data;
    let phase = s0.phase;
    if (b.advance) {
      const n = nextPhase(toIdeaMode(s0.mode), s0.phase);
      if (n) phase = n;
    } else if (b.phase) {
      if (!isValidPhase(toIdeaMode(s0.mode), b.phase)) {
        return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
      }
      if (b.phase !== s0.phase) {
        void dispatchWebhooks(userId, "session.phase_changed", {
          sessionId: id,
          from: s0.phase,
          to: b.phase,
        });
      }
      phase = b.phase;
    }
    const next = await prisma.ideaSession.update({
      where: { id },
      data: {
        title: b.title,
        focusRegion: b.focusRegion === null ? null : b.focusRegion,
        focusIndustry: b.focusIndustry === null ? null : b.focusIndustry,
        researchMode: b.researchMode,
        scorecard:
          b.scorecard === undefined
            ? undefined
            : typeof b.scorecard === "string"
              ? b.scorecard
              : JSON.stringify(b.scorecard),
        assumptions:
          b.assumptions === undefined
            ? undefined
            : typeof b.assumptions === "string"
              ? b.assumptions
              : JSON.stringify(b.assumptions),
        phase,
        updatedAt: new Date(),
      },
    });
    void dispatchWebhooks(userId, "session.updated", { sessionId: id });
    return NextResponse.json({ session: next });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
