# Product decisions (v1)

These replace the pre-build “clarify user / sources / MCP” discussion with shipped defaults. You can change them per deployment.

| Topic | Decision |
|--------|----------|
| **Primary user** | Solo founder / IC product thinker. Copy and default phases are tuned for that persona; team features stay out of v1. |
| **Current affairs** | **Tavily**-backed web search when `TAVILY_API_KEY` is set. Without a key, the assistant still runs but does not call live search (the UI shows a clear notice). Optional focus: `focusRegion` + `focusIndustry` on each session. |
| **REST vs MCP** | **v1: REST + handoff JSON + webhooks** for integration with other agents. A small **MCP** entry (`src/mcp/server.ts` + `npm run mcp`) is included so Cursor/Claude Desktop can call the same session logic via stdio, without blocking core delivery. |
| **Trust / compliance** | Not legal or investment advice. Users must verify anything tied to current events. |

MVP path: start session → pick mode (Opportunity scan / Product & tech / Business & GTM) → guided phases → scorecard + assumptions → **one-pager** artifact (Markdown) + **handoff JSON** for other agents.
