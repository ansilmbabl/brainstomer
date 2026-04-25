import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type WebhookEvent =
  | "session.created"
  | "session.updated"
  | "session.phase_changed"
  | "message.created"
  | "artifact.published";

export async function dispatchWebhooks(
  userId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
) {
  const hooks = await prisma.webhookEndpoint.findMany({
    where: { userId, active: true },
  });
  for (const h of hooks) {
    const events: string[] = (() => {
      try {
        return JSON.parse(h.events) as string[];
      } catch {
        return [];
      }
    })();
    if (!events.includes(event)) continue;
    const body = JSON.stringify({
      event,
      ...payload,
      at: new Date().toISOString(),
    });
    const sig = crypto.createHmac("sha256", h.secret).update(body).digest("hex");
    try {
      await fetch(h.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brainstormer-Signature": `sha256=${sig}`,
        },
        body,
      });
    } catch {
      // Fire-and-forget; production would queue & retry
    }
  }
}
