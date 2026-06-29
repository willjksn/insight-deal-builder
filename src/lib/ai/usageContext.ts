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
    [/\/api\/scout\/[^/]+\/analyze$/, "scout.analyze"],
    [/\/api\/scout\/[^/]+\/dp-plan$/, "scout.dp_plan"],
    [/\/api\/scout\/[^/]+\/shot-list$/, "scout.shot_list"],
    [/\/api\/scout\/[^/]+\/preview$/, "scout.preview"],
    [/\/api\/scout\/[^/]+\/technique-lookup$/, "scout.technique"],
    [/\/api\/scout\/suggest-gear$/, "scout.gear"],
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
    [/\/api\/health\/scout-ai$/, "health.scout_ai"],
  ];
  for (const [re, feature] of rules) {
    if (re.test(p)) return feature;
  }
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
