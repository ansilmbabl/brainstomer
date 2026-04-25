export const IdeaModes = ["OPPORTUNITY_SCAN", "PRODUCT_TECH", "BUSINESS_GTM"] as const;
export type IdeaMode = (typeof IdeaModes)[number];

export function isIdeaMode(s: string): s is IdeaMode {
  return (IdeaModes as readonly string[]).includes(s);
}

export function toIdeaMode(s: string): IdeaMode {
  return isIdeaMode(s) ? s : "OPPORTUNITY_SCAN";
}
