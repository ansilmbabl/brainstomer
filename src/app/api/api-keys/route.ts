import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { requireUserId, HttpError } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

const createBody = z.object({
  name: z.string().min(1).max(80),
});

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    });
    return NextResponse.json({ keys });
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
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    const raw = `bsk_${randomBytes(32).toString("hex")}`;
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const row = await prisma.apiKey.create({
      data: { userId, name: parsed.data.name, tokenHash },
    });
    return NextResponse.json({
      id: row.id,
      name: row.name,
      /** Shown only once. Store securely. */
      token: raw,
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
