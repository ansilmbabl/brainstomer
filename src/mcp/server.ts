/**
 * stdio MCP server: connects external agent hosts (e.g. Cursor) to the same session logic.
 * Configure env: DATABASE_URL, OPENAI_API_KEY, optional TAVILY_API_KEY,
 * and MCP_USER_ID (a valid User id from this database).
 * Run: npm run mcp
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { IdeaModes } from "../lib/modes";
import {
  appendUserMessageAndReply,
  createIdeaSession,
  exportHandoffJson,
} from "../lib/idea-actions";
import { prisma } from "../lib/prisma";

const userId = process.env.MCP_USER_ID;
if (!userId) {
  console.error("Set MCP_USER_ID to a User.id from the Brainstormer database.");
  process.exit(1);
}

const server = new McpServer(
  { name: "brainstormer", version: "0.1.0" },
  { instructions: "Brainstormer ideation sessions with optional web search and handoff JSON export." },
);

server.registerTool(
  "session_create",
  {
    title: "Create ideation session",
    description: "Start a new brainstorm with an IdeaMode and optional regional focus.",
    inputSchema: z.object({
      title: z.string().describe("Session title"),
      mode: z.enum(IdeaModes),
      focusRegion: z.string().optional(),
      focusIndustry: z.string().optional(),
      researchMode: z.boolean().optional(),
    }),
  },
  async (args) => {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u) {
      return { content: [{ type: "text" as const, text: "MCP_USER_ID is not a valid user." }] };
    }
    const s = await createIdeaSession(userId, {
      title: args.title,
      mode: args.mode,
      focusRegion: args.focusRegion,
      focusIndustry: args.focusIndustry,
      researchMode: args.researchMode,
    });
    return { content: [{ type: "text" as const, text: JSON.stringify({ sessionId: s.id, phase: s.phase }) }] };
  },
);

server.registerTool(
  "session_message",
  {
    title: "Post message in session",
    inputSchema: z.object({
      sessionId: z.string(),
      content: z.string(),
    }),
  },
  async (args) => {
    const res = await appendUserMessageAndReply(userId, args.sessionId, args.content);
    if (!res) {
      return { content: [{ type: "text" as const, text: "Not found" }] };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            reply: res.reply,
            session: { phase: res.session?.phase, artifactMd: res.session?.artifactMd },
          }),
        },
      ],
    };
  },
);

server.registerTool(
  "session_handoff",
  {
    title: "Export handoff JSON",
    inputSchema: z.object({ sessionId: z.string() }),
  },
  async (args) => {
    const h = await exportHandoffJson(userId, args.sessionId);
    if (!h) {
      return { content: [{ type: "text" as const, text: "Not found" }] };
    }
    return { content: [{ type: "text" as const, text: JSON.stringify(h) }] };
  },
);

const transport = new StdioServerTransport();
void server.connect(transport);
