This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## LLM: OpenAI or Ollama

- **OpenAI (default if `LLM_PROVIDER` is unset):** set `OPENAI_API_KEY` in `.env`. Optionally set `LLM_PROVIDER=openai` and `OPENAI_MODEL`.
- **Ollama (local, no API bill):** install [Ollama](https://ollama.com), run `ollama serve`, pull a model (e.g. `ollama pull llama3.2`), then in `.env` set `LLM_PROVIDER=ollama` and (optionally) `OLLAMA_MODEL` as a default. After sign-in, open **Settings → LLM** to **list and pick** a model from your machine; that choice is saved per account and overrides the env default. If you get “model not found / 404”, pull the model or pick a name that matches `ollama list`.
  - Optional: `OLLAMA_BASE_URL` (defaults to `http://127.0.0.1:11434`)

Tavily (`TAVILY_API_KEY`) is still optional; without it, “current affairs” context is limited. Ollama uses the OpenAI-compatible API at `/v1` (see Ollama docs).

**Prisma: “Unknown field ollamaModel” (or similar):** the generated client is stale or the dev cache is. Run `npm run rebuild` (clears `.next`, regenerates Prisma, starts dev) or, manually: `npx prisma generate && npx prisma migrate dev && rm -rf .next` then `npm run dev`. Ensure your `prisma/schema.prisma` includes `ollamaModel` on `User` and migrations are applied.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
