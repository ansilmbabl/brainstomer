import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, HttpError } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { createIdeaSession } from "@/lib/idea-actions";
import { IdeaModes } from "@/lib/modes";
const createBody = z.object({
  title: z.string().min(1).max(200),
  mode: z.enum(IdeaModes),
  focusRegion: z.string().max(100).optional(),
  focusIndustry: z.string().max(100).optional(),
  researchMode: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const take = Math.min(50, Number(searchParams.get("limit") || 30) || 30);
    const list = await prisma.ideaSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take,
      select: {
        id: true,
        title: true,
        mode: true,
        phase: true,
        researchMode: true,
        focusRegion: true,
        focusIndustry: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ sessions: list });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const json = await req.json().catch(() => null);
    const parsed = createBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const s = await createIdeaSession(userId, parsed.data);
    return NextResponse.json({ session: s });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
