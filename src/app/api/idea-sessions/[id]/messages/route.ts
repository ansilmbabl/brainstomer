import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, HttpError } from "@/lib/auth-context";
import { appendUserMessageAndReply } from "@/lib/idea-actions";

const body = z.object({
  content: z.string().min(1).max(32_000),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId(req);
    const { id } = await ctx.params;
    const json = await req.json().catch(() => null);
    const parsed = body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const res = await appendUserMessageAndReply(
      userId,
      id,
      parsed.data.content,
    );
    if (!res) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      reply: res.reply,
      session: res.session,
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
