import { NextResponse } from "next/server";
import { requireUserId, HttpError } from "@/lib/auth-context";
import { exportHandoffJson, exportMarkdown } from "@/lib/idea-actions";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId(req);
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "handoff";
    if (format === "handoff" || format === "json") {
      const h = await exportHandoffJson(userId, id);
      if (!h) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(h, {
        headers: {
          "Content-Disposition": `attachment; filename="handoff-${id}.json"`,
        },
      });
    }
    if (format === "md" || format === "markdown") {
      const md = await exportMarkdown(userId, id);
      if (!md) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return new NextResponse(md, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="session-${id}.md"`,
        },
      });
    }
    return NextResponse.json(
      { error: "format must be handoff, json, or md" },
      { status: 400 },
    );
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
