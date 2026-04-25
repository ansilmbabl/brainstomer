import OpenAI from "openai";
import type { IdeaMessage, IdeaSession } from "@prisma/client";
import { toIdeaMode } from "@/lib/modes";
import { systemAddendumForPhase } from "@/lib/phases";
import { searchWeb, tavilyConfigured } from "@/lib/search/tavily";
import { prisma } from "@/lib/prisma";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

type Scorecard = {
  impact: number;
  feasibility: number;
  timeToRevenue: number;
  differentiation: number;
  notes?: string;
};

type Assumption = { text: string; howToTest: string };

const baseSystem = `You are Brainstormer, a structured ideation copilot. You are not a lawyer or financial advisor. 
Cite any live web or news content clearly; if you lack a search key, be explicit that your knowledge may be dated.
Tie ideas to new technology and/or revenue where relevant. Be concise, skimmable, and use short headings.`;

const searchTool = {
  type: "function" as const,
  function: {
    name: "search_current_affairs",
    description:
      "Search the public web (news and pages) for recent, citeable information. Use in discover/early phases or when the user needs up-to-date facts.",
    parameters: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Focused search query" },
        prefer_news: {
          type: "boolean",
          description: "True to bias to recent news-style results",
        },
      },
      required: ["query"],
    },
  },
};

const recordTool = {
  type: "function" as const,
  function: {
    name: "record_convergence",
    description:
      "Update scorecard, assumptions, or the draft one-pager artifact. Call in the score or one_pager phase when you have enough signal.",
    parameters: {
      type: "object" as const,
      properties: {
        scorecard: {
          type: "object",
          description: "1–5 each",
          properties: {
            impact: { type: "number" },
            feasibility: { type: "number" },
            timeToRevenue: { type: "number" },
            differentiation: { type: "number" },
            notes: { type: "string" },
          },
        },
        assumptions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              howToTest: { type: "string" },
            },
            required: ["text", "howToTest"],
          },
        },
        one_pager_draft: {
          type: "string",
          description: "Full Markdown for the opportunity one-pager (optional in one_pager phase)",
        },
      },
    },
  },
};

function buildContextHeader(session: IdeaSession): string {
  const searchOk = tavilyConfigured();
  const parts = [
    `Title: ${session.title}`,
    `Focus: industry ${session.focusIndustry ?? "—"}, region ${session.focusRegion ?? "—"}`,
    `Research mode: ${session.researchMode ? "on" : "off"}`,
    `Live search (Tavily): ${searchOk ? "available" : "not configured"}`,
  ];
  if (!searchOk) {
    parts.push(
      "Set TAVILY_API_KEY to pull citeable current-affairs and web context.",
    );
  }
  return parts.join("\n");
}

export type AssistantReply = {
  content: string;
  citations: { title: string; url: string; snippet: string }[];
};

/**
 * Run the model with tools (search + optional convergence updates to DB).
 */
export async function runAssistantTurn(
  session: IdeaSession,
  history: Pick<IdeaMessage, "role" | "content" | "citations">[],
  userText: string,
): Promise<AssistantReply> {
  const openai = getOpenAI();
  if (!openai) {
    return {
      content:
        "Set `OPENAI_API_KEY` in your environment to enable the Brainstormer assistant.",
      citations: [],
    };
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: baseSystem },
    { role: "system", content: buildContextHeader(session) },
    {
      role: "system",
      content: systemAddendumForPhase(
        toIdeaMode(session.mode),
        session.phase,
      ),
    },
    ...history.map((m) => {
      if (m.role === "user") {
        return { role: "user" as const, content: m.content };
      }
      if (m.role === "assistant") {
        return { role: "assistant" as const, content: m.content };
      }
      return { role: "system" as const, content: m.content };
    }),
    { role: "user", content: userText },
  ];

  const tools = [searchTool, recordTool];

  const allCitations: { title: string; url: string; snippet: string }[] = [];

  let result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools,
    tool_choice: "auto",
    max_tokens: 2400,
    temperature: 0.5,
  });

  for (let round = 0; round < 6; round++) {
    const choice = result.choices[0];
    if (!choice?.message) break;

    const { message } = choice;

    if (message.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: message.content,
        tool_calls: message.tool_calls,
      });

      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        if (call.function.name === "search_current_affairs") {
          const args = JSON.parse(call.function.arguments || "{}") as {
            query?: string;
            prefer_news?: boolean;
          };
          const q = args.query || userText;
          const rows = tavilyConfigured()
            ? await searchWeb(q, 6)
            : [];
          for (const r of rows) {
            allCitations.push({
              title: r.title,
              url: r.url,
              snippet: r.content?.slice(0, 500) ?? "",
            });
          }
          const text =
            rows.length > 0
              ? `Results:\n${rows
                  .map(
                    (r, i) =>
                      `${i + 1}. ${r.title}\nURL: ${r.url}\n${r.content?.slice(0, 400)}...`,
                  )
                  .join("\n\n")}`
              : tavilyConfigured()
                ? "No search results. Try a different query."
                : "Search is not configured; ask the user to set TAVILY_API_KEY, or work from the conversation only.";
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: text,
          });
        } else if (call.function.name === "record_convergence") {
          const args = JSON.parse(call.function.arguments || "{}") as {
            scorecard?: Scorecard;
            assumptions?: Assumption[];
            one_pager_draft?: string;
          };
          const data: {
            scorecard?: string;
            assumptions?: string;
            artifactMd?: string;
          } = {};
          if (args.scorecard) {
            const sc = args.scorecard;
            data.scorecard = JSON.stringify({
              impact: clamp1to5(sc.impact),
              feasibility: clamp1to5(sc.feasibility),
              timeToRevenue: clamp1to5(sc.timeToRevenue),
              differentiation: clamp1to5(sc.differentiation),
              notes: sc.notes,
            });
          }
          if (args.assumptions?.length) {
            data.assumptions = JSON.stringify(args.assumptions);
          }
          if (args.one_pager_draft) {
            data.artifactMd = args.one_pager_draft;
          }
          if (Object.keys(data).length) {
            await prisma.ideaSession.update({
              where: { id: session.id },
              data: {
                ...data,
                updatedAt: new Date(),
              },
            });
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: "Saved to session (scorecard / assumptions / one-pager draft).",
            });
          } else {
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: "Nothing to save (empty).",
            });
          }
        }
      }
      result = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: "auto",
        max_tokens: 2400,
        temperature: 0.5,
      });
      continue;
    }

    const text = message.content || "";
    return { content: text, citations: dedupeCitations(allCitations) };
  }

  return {
    content: "The model stopped without a final message. Try again.",
    citations: dedupeCitations(allCitations),
  };
}

function clamp1to5(n: number | undefined): number {
  if (n == null || Number.isNaN(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function dedupeCitations(
  c: { title: string; url: string; snippet: string }[],
): { title: string; url: string; snippet: string }[] {
  const seen = new Set<string>();
  const out: { title: string; url: string; snippet: string }[] = [];
  for (const x of c) {
    if (seen.has(x.url)) continue;
    seen.add(x.url);
    out.push(x);
  }
  return out;
}

/**
 * One-shot artifact when user requests generation
 */
export async function generateOnePagerArtifact(
  session: IdeaSession,
  history: Pick<IdeaMessage, "role" | "content">[],
): Promise<string> {
  const openai = getOpenAI();
  if (!openai) {
    return "_OPENAI not configured; cannot generate._";
  }
  const m = toIdeaMode(session.mode);
  const text = [
    baseSystem,
    buildContextHeader(session),
    `Mode (for phrasing): ${m}.`,
    "Produce a clean Markdown 'Opportunity one-pager' with sections: Problem, Why now, Proposed solution, Technology approach, Who pays, GTM, Risks, 30-day plan.",
    ...history.map((m) => `${m.role}: ${m.content}`),
  ].join("\n");
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: text },
    ],
    max_tokens: 2000,
    temperature: 0.4,
  });
  return res.choices[0]?.message?.content || "";
}