import type OpenAI from "openai";
import type { IdeaMessage, IdeaSession } from "@prisma/client";
import { toIdeaMode } from "@/lib/modes";
import { systemAddendumForPhase } from "@/lib/phases";
import {
  getChatModel,
  missingLlmMessage,
  ollamaModelMissingMessage,
  isOllamaModelNotFoundError,
  type ChatModelConfig,
} from "@/lib/ai/llm";
import { searchWeb, tavilyConfigured } from "@/lib/search/tavily";
import { prisma } from "@/lib/prisma";

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

const tools = [searchTool, recordTool];

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

function buildChatMessages(
  session: IdeaSession,
  history: Pick<IdeaMessage, "role" | "content" | "citations">[],
  userText: string,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
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
}

/**
 * Ollama + small models often lack reliable tool support; one Tavily pre-pass + plain chat.
 */
async function runOllamaHeuristicSearch(
  session: IdeaSession,
  userText: string,
  base: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<{
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  citations: { title: string; url: string; snippet: string }[];
}> {
  const citations: { title: string; url: string; snippet: string }[] = [];
  if (
    !tavilyConfigured() ||
    !(session.phase === "discover" || session.researchMode)
  ) {
    return { messages: base, citations };
  }
  const rows = await searchWeb(userText, 5);
  for (const r of rows) {
    citations.push({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 500) ?? "",
    });
  }
  if (rows.length === 0) {
    return { messages: base, citations };
  }
  const block = rows
    .map(
      (r, i) =>
        `${i + 1}. ${r.title}\n   ${r.url}\n   ${(r.content ?? "").slice(0, 500)}`,
    )
    .join("\n\n");
  return {
    messages: [
      base[0],
      {
        role: "system",
        content: `Tavily web context for this turn (cite these in your answer when relevant):\n\n${block}`,
      },
      ...base.slice(1),
    ],
    citations,
  };
}

export type AssistantReply = {
  content: string;
  citations: { title: string; url: string; snippet: string }[];
};

async function runWithTools(
  llm: ChatModelConfig,
  session: IdeaSession,
  history: Pick<IdeaMessage, "role" | "content" | "citations">[],
  userText: string,
): Promise<AssistantReply> {
  const { client, model } = llm;
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    buildChatMessages(session, history, userText);
  const allCitations: { title: string; url: string; snippet: string }[] = [];

  let result = await client.chat.completions.create({
    model,
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
          const rows = tavilyConfigured() ? await searchWeb(q, 6) : [];
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
              data: { ...data, updatedAt: new Date() },
            });
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content:
                "Saved to session (scorecard / assumptions / one-pager draft).",
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
      result = await client.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: "auto",
        max_tokens: 2400,
        temperature: 0.5,
      });
      continue;
    }
    return {
      content: message.content || "",
      citations: dedupeCitations(allCitations),
    };
  }
  return {
    content: "The model stopped without a final message. Try again.",
    citations: dedupeCitations(allCitations),
  };
}

/**
 * Run the model with tools (search + optional convergence updates to DB), or a plain
 * Ollama path if tool calls are not supported.
 */
export async function runAssistantTurn(
  session: IdeaSession,
  history: Pick<IdeaMessage, "role" | "content" | "citations">[],
  userText: string,
  userId?: string | null,
): Promise<AssistantReply> {
  const llm = await getChatModel(userId);
  if (!llm) {
    return { content: missingLlmMessage(), citations: [] };
  }

  if (llm.provider === "ollama") {
    try {
      return await runWithTools(llm, session, history, userText);
    } catch (e) {
      if (isOllamaModelNotFoundError(e)) {
        return { content: ollamaModelMissingMessage(llm.model), citations: [] };
      }
      try {
        const base = buildChatMessages(session, history, userText);
        const { messages, citations } = await runOllamaHeuristicSearch(
          session,
          userText,
          base,
        );
        const res = await llm.client.chat.completions.create({
          model: llm.model,
          messages,
          max_tokens: 2400,
          temperature: 0.5,
        });
        const text = res.choices[0]?.message?.content || "";
        return { content: text, citations: dedupeCitations(citations) };
      } catch (e2) {
        if (isOllamaModelNotFoundError(e2)) {
          return { content: ollamaModelMissingMessage(llm.model), citations: [] };
        }
        const msg = e2 instanceof Error ? e2.message : String(e2);
        return {
          content: `Ollama request failed: ${msg}`,
          citations: [],
        };
      }
    }
  }
  return runWithTools(llm, session, history, userText);
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
  userId?: string | null,
): Promise<string> {
  const llm = await getChatModel(userId);
  if (!llm) {
    return "_LLM not configured. Set LLM_PROVIDER=ollama or OPENAI_API_KEY._";
  }
  const m = toIdeaMode(session.mode);
  const text = [
    baseSystem,
    buildContextHeader(session),
    `Mode (for phrasing): ${m}.`,
    "Produce a clean Markdown 'Opportunity one-pager' with sections: Problem, Why now, Proposed solution, Technology approach, Who pays, GTM, Risks, 30-day plan.",
    ...history.map((row) => `${row.role}: ${row.content}`),
  ].join("\n");
  try {
    const res = await llm.client.chat.completions.create({
      model: llm.model,
      messages: [{ role: "user", content: text }],
      max_tokens: 2000,
      temperature: 0.4,
    });
    return res.choices[0]?.message?.content || "";
  } catch (e) {
    if (llm.provider === "ollama" && isOllamaModelNotFoundError(e)) {
      return ollamaModelMissingMessage(llm.model);
    }
    const msg = e instanceof Error ? e.message : String(e);
    return `_Artifact generation failed: ${msg}_`;
  }
}
