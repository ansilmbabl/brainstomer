import { type IdeaMode, toIdeaMode } from "@/lib/modes";
import { firstPhase, isValidPhase, nextPhase, phaseLabel } from "@/lib/phases";

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return s;
  }
}
import { runAssistantTurn, generateOnePagerArtifact } from "@/lib/ai/orchestrator";
import { prisma } from "@/lib/prisma";
import { buildHandoff } from "@/lib/handoff";
import { dispatchWebhooks } from "@/lib/webhooks";

export async function createIdeaSession(
  userId: string,
  input: {
    title: string;
    mode: IdeaMode;
    focusRegion?: string;
    focusIndustry?: string;
    researchMode?: boolean;
  },
) {
  const phase = firstPhase(input.mode);
  const session = await prisma.ideaSession.create({
    data: {
      userId,
      title: input.title,
      mode: input.mode,
      phase,
      focusRegion: input.focusRegion,
      focusIndustry: input.focusIndustry,
      researchMode: input.researchMode ?? false,
    },
  });
  await prisma.ideaMessage.create({
    data: {
      ideaSessionId: session.id,
      role: "assistant",
      content: `Welcome to **${session.title}** (${input.mode.replace(/_/g, " ")}).  
Current phase: **${phase}** — ${phaseLabel(phase)}.

Not legal or investment advice. Tell me what you are exploring, or ask for recent context in your space.`,
    },
  });
  void dispatchWebhooks(userId, "session.created", {
    sessionId: session.id,
    title: session.title,
    mode: session.mode,
    phase: session.phase,
  });
  return session;
}

export async function appendUserMessageAndReply(
  userId: string,
  ideaSessionId: string,
  text: string,
) {
  const session = await prisma.ideaSession.findFirst({
    where: { id: ideaSessionId, userId },
  });
  if (!session) return null;
  const prior = await prisma.ideaMessage.findMany({
    where: { ideaSessionId },
    orderBy: { createdAt: "asc" },
  });
  const history = prior.map((m) => ({
    role: m.role,
    content: m.content,
    citations: m.citations,
  }));
  await prisma.ideaMessage.create({
    data: {
      ideaSessionId,
      role: "user",
      content: text,
    },
  });
  const reply = await runAssistantTurn(session, history, text);
  await prisma.ideaMessage.create({
    data: {
      ideaSessionId,
      role: "assistant",
      content: reply.content,
      citations: reply.citations.length
        ? JSON.stringify(reply.citations)
        : undefined,
    },
  });
  await prisma.ideaSession.update({
    where: { id: ideaSessionId },
    data: { updatedAt: new Date() },
  });
  const fresh = await prisma.ideaSession.findFirst({
    where: { id: ideaSessionId, userId },
  });
  void dispatchWebhooks(userId, "message.created", {
    sessionId: ideaSessionId,
  });
  return { session: fresh, reply };
}

export async function updateSessionPhase(
  userId: string,
  id: string,
  newPhase: string,
) {
  const s = await prisma.ideaSession.findFirst({ where: { id, userId } });
  if (!s) return null;
  if (!isValidPhase(toIdeaMode(s.mode), newPhase))
    return { error: "Invalid phase" as const };
  const old = s.phase;
  if (old === newPhase) return s;
  const next = await prisma.ideaSession.update({
    where: { id },
    data: { phase: newPhase, updatedAt: new Date() },
  });
  void dispatchWebhooks(userId, "session.phase_changed", {
    sessionId: id,
    from: old,
    to: newPhase,
  });
  return next;
}

export async function advanceToNext(
  userId: string,
  id: string,
) {
  const s = await prisma.ideaSession.findFirst({ where: { id, userId } });
  if (!s) return null;
  const n = nextPhase(toIdeaMode(s.mode), s.phase);
  if (!n) return { error: "Already at last phase" as const };
  return updateSessionPhase(userId, id, n);
}

export async function runArtifact(
  userId: string,
  id: string,
) {
  const s = await prisma.ideaSession.findFirst({ where: { id, userId } });
  if (!s) return null;
  const msgs = await prisma.ideaMessage.findMany({
    where: { ideaSessionId: id },
    orderBy: { createdAt: "asc" },
  });
  const md = await generateOnePagerArtifact(
    s,
    msgs.map((m) => ({ role: m.role, content: m.content })),
  );
  const updated = await prisma.ideaSession.update({
    where: { id },
    data: { artifactMd: md, updatedAt: new Date() },
  });
  void dispatchWebhooks(userId, "artifact.published", { sessionId: id });
  return updated;
}

export async function exportHandoffJson(
  userId: string,
  id: string,
) {
  const s = await prisma.ideaSession.findFirst({ where: { id, userId } });
  if (!s) return null;
  const msgs = await prisma.ideaMessage.findMany({
    where: { ideaSessionId: id },
    orderBy: { createdAt: "asc" },
  });
  return buildHandoff(s, msgs, []);
}

export async function exportMarkdown(
  userId: string,
  id: string,
) {
  const s = await prisma.ideaSession.findFirst({ where: { id, userId } });
  if (!s) return null;
  const msgRows = await prisma.ideaMessage.findMany({
    where: { ideaSessionId: id },
    orderBy: { createdAt: "asc" },
  });
  const handoff = buildHandoff(s, msgRows, []);
  const scObj = s.scorecard ? safeJson(s.scorecard) : null;
  const asObj = s.assumptions ? safeJson(s.assumptions) : null;
  const sc = scObj
    ? `## Scorecard\n\`\`\`json\n${JSON.stringify(scObj, null, 2)}\n\`\`\`\n\n`
    : "";
  const as = asObj
    ? `## Assumptions\n\`\`\`json\n${JSON.stringify(asObj, null, 2)}\n\`\`\`\n\n`
    : "";
  const art = s.artifactMd
    ? `## One-pager\n\n${s.artifactMd}\n\n`
    : "";
  return `# ${s.title}\n\n${sc}${as}${art}## Transcript\n\n${handoff.messages.map((m) => `**${m.role}** (${m.createdAt}):\n${m.content}\n`).join("\n")}`;
}
