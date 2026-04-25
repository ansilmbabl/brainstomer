import { createHash } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Resolves a user id from session cookie or `Authorization: Bearer bsk_...` API key.
 */
export async function requireUserId(req: Request): Promise<string> {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (uid) return uid;

  const h = req.headers.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) {
    const token = h.slice(7).trim();
    if (token.startsWith("bsk_")) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const key = await prisma.apiKey.findUnique({
        where: { tokenHash },
      });
      if (key) {
        await prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        });
        return key.userId;
      }
    }
  }

  throw new HttpError(401, "Unauthorized");
}
