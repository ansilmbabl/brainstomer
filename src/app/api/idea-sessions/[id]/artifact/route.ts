import { NextResponse } from "next/server";
import { requireUserId, HttpError } from "@/lib/auth-context";
import { runArtifact } from "@/lib/idea-actions";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId(req);
    const { id } = await ctx.params;
    const u = await runArtifact(userId, id);
    if (!u) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ session: u, artifactMd: u.artifactMd });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
