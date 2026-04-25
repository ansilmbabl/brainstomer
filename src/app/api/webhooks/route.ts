import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { requireUserId, HttpError } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

const events = z.enum([
  "session.created",
  "session.updated",
  "session.phase_changed",
  "message.created",
  "artifact.published",
]);

const createBody = z.object({
  url: z.string().url(),
  events: z.array(events).min(1),
  secret: z.string().min(16).optional(),
});

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const list = await prisma.webhookEndpoint.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, events: true, active: true, createdAt: true },
    });
    return NextResponse.json({ webhooks: list });
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
      return NextResponse.json(
        { error: "url and events (array) required; optional secret min 16 chars" },
        { status: 400 },
      );
    }
    const secret = parsed.data.secret ?? randomBytes(32).toString("hex");
    const row = await prisma.webhookEndpoint.create({
      data: {
        userId,
        url: parsed.data.url,
        events: JSON.stringify(parsed.data.events),
        secret,
      },
    });
    return NextResponse.json({
      id: row.id,
      url: row.url,
      events: row.events,
      /** Shown on create; store for verifying signatures */
      secret,
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
