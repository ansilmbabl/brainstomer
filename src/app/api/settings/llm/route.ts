import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, HttpError } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { fetchOllamaModelTags } from "@/lib/ollama-list";

const DEFAULT_OLLAMA_MODEL = "llama3.2:latest";

const patchBody = z.object({
  ollamaModel: z.union([z.string().min(1).max(200), z.null()]),
});

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const prov = process.env.LLM_PROVIDER?.toLowerCase();
    const isOllama = prov === "ollama";
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ollamaModel: true },
    });
    const envDefault =
      process.env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
    const userOllamaModel = user?.ollamaModel ?? null;
    const effectiveModel = userOllamaModel?.trim() || envDefault;
    const { models, error: ollamaListError } = isOllama
      ? await fetchOllamaModelTags()
      : { models: [], error: undefined };
    return NextResponse.json({
      isOllama,
      envDefault,
      userOllamaModel,
      effectiveModel,
      models,
      ollamaListError: ollamaListError ?? null,
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId(req);
    const prov = process.env.LLM_PROVIDER?.toLowerCase();
    if (prov !== "ollama") {
      return NextResponse.json(
        { error: "Ollama model preference only applies when LLM_PROVIDER=ollama" },
        { status: 400 },
      );
    }
    const json = await req.json().catch(() => null);
    const parsed = patchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Body: { ollamaModel: string | null }" },
        { status: 400 },
      );
    }
    const value = parsed.data.ollamaModel;
    await prisma.user.update({
      where: { id: userId },
      data: {
        ollamaModel: value === null ? null : value.trim() || null,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
