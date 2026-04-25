import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SessionWorkspace } from "@/components/SessionWorkspace";

type P = { params: Promise<{ id: string }> };

export default async function SessionPage(props: P) {
  const { id } = await props.params;
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) notFound();
  const row = await prisma.ideaSession.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) notFound();
  const parseJ = (s: string | null) => {
    if (s == null) return null;
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return s;
    }
  };
  return (
    <SessionWorkspace
      initial={{
        id: row.id,
        title: row.title,
        mode: row.mode,
        phase: row.phase,
        researchMode: row.researchMode,
        focusRegion: row.focusRegion,
        focusIndustry: row.focusIndustry,
        scorecard: parseJ(row.scorecard),
        assumptions: parseJ(row.assumptions),
        artifactMd: row.artifactMd,
        messages: row.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations ? parseJ(m.citations) : null,
        })),
      }}
    />
  );
}
