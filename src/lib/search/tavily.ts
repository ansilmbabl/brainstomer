import { tavily } from "@tavily/core";

export type SearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

/**
 * When TAVILY_API_KEY is missing, return empty results (caller should surface a user-visible notice).
 */
export async function searchWeb(query: string, max = 5): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const client = tavily({ apiKey: key });
  const res = await client.search(query, { maxResults: max });
  if (!("results" in res) || !res.results) return [];
  return res.results.map((r) => ({
    title: r.title ?? r.url,
    url: r.url,
    content: (r.content as string) ?? "",
    score: r.score,
  }));
}

export function tavilyConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}
