import { AsyncLocalStorage } from "async_hooks";
import { NextRequest } from "next/server";

export type AiUsageContext = {
  userId?: string;
  feature?: string;
  path?: string;
};

const store = new AsyncLocalStorage<AiUsageContext>();

export function getAiUsageContext(): AiUsageContext | undefined {
  return store.getStore();
}

export function runWithAiUsageContext<T>(ctx: AiUsageContext, fn: () => T): T {
  return store.run(ctx, fn);
}

export async function runWithAiUsageContextAsync<T>(
  ctx: AiUsageContext,
  fn: () => Promise<T>
): Promise<T> {
  return store.run(ctx, fn);
}

export function inferFeatureFromPath(pathname: string): string {
  const p = pathname.replace(/\/+$/, "");
  const rules: Array<[RegExp, string]> = [
    [/\/api\/script-writer\/sessions\/[^/]+\/chat$/, "script_writer.chat"],
    [/\/api\/script-writer\/sessions\/[^/]+\/analyze$/, "script_writer.analyze"],
    [/\/api\/script-writer\/sessions\/[^/]+\/generate$/, "script_writer.generate"],
    [/\/api\/script-writer\/sessions\/[^/]+\/confirm-analysis$/, "script_writer.generate"],
    [/\/api\/script-writer\/sessions\/[^/]+\/refine$/, "script_writer.refine"],
    [/\/api\/script-writer\/sessions\/[^/]+\/trends$/, "script_writer.trends"],
    [/\/api\/script-writer\/sessions$/, "script_writer.create"],
    [/\/api\/agreements\/suggest-scope$/, "agreements.scope"],
    [/\/api\/agreements\/pricing-research$/, "agreements.pricing"],
    [/\/api\/cron\/trend-snapshots$/, "cron.trends"],
    [/\/api\/projects\/[^/]+\/coverage\/generate-frame$/, "coverage.frame"],
    [/\/api\/projects\/[^/]+\/coverage\/generate-frames$/, "coverage.frame"],
    // Revenue & opportunities — AI/search-backed endpoints.
    [/\/api\/revenue\/meetings\/[^/]+\/transcribe$/, "revenue.meeting.transcribe"],
    [/\/api\/revenue\/meetings\/[^/]+\/analyze$/, "revenue.meeting.analyze"],
    [/\/api\/revenue\/business-profiles\/[^/]+\/draft$/, "revenue.profile.draft"],
    [/\/api\/revenue\/opportunities\/[^/]+\/verify$/, "revenue.verify"],
    [/\/api\/revenue\/opportunities\/[^/]+\/find-contact$/, "revenue.contact"],
    [/\/api\/revenue\/opportunities\/[^/]+\/agents\/[^/]+$/, "revenue.intel"],
    [/\/api\/revenue\/opportunities\/[^/]+\/quality-review$/, "revenue.quality"],
    [/\/api\/revenue\/opportunities\/[^/]+\/revision$/, "revenue.revision"],
    [/\/api\/revenue\/opportunities\/[^/]+\/proposal-draft$/, "revenue.proposal"],
    [/\/api\/revenue\/opportunities\/[^/]+\/outreach-draft$/, "revenue.outreach"],
    [/\/api\/revenue\/opportunities\/[^/]+\/discovery-prep$/, "revenue.discovery"],
    [/\/api\/revenue\/opportunities\/[^/]+\/campaign-concept$/, "revenue.concept"],
    [/\/api\/revenue\/campaigns\/[^/]+\/research$/, "revenue.research"],
    [/\/api\/revenue\/discovery\/[^/]+\/debrief$/, "revenue.discovery"],
  ];
  for (const [re, feature] of rules) {
    if (re.test(p)) return feature;
  }
  // Catch-all for remaining revenue endpoints so cost is attributed to the
  // revenue workspace rather than lumped into "api.other".
  if (p.startsWith("/api/revenue/")) return "revenue.other";
  if (p.startsWith("/api/")) return "api.other";
  return "unknown";
}

/** Call from authenticated API routes so usage logs include user + feature. */
export function bindAiUsageRequest(request: NextRequest, userId?: string): void {
  const path = new URL(request.url).pathname;
  const existing = store.getStore();
  const ctx: AiUsageContext = {
    userId: userId ?? existing?.userId,
    path,
    feature: inferFeatureFromPath(path),
  };
  store.enterWith(ctx);
}

export function bindAiUsageCron(feature: string): void {
  store.enterWith({ feature, path: "/api/cron/trend-snapshots" });
}
