import { getAiUsageContext } from "@/lib/ai/usageContext";

/**
 * Structured, low-noise telemetry for live AI/search calls.
 *
 * This is intentionally separate from `usageLog.ts` (which records billable
 * token/credit cost to Firestore). This module emits a single structured
 * console line per call — including latency and success/failure — so live-mode
 * problems (timeouts, auth errors, provider outages) are diagnosable from logs.
 * It never throws and never blocks the call path.
 */

export type AiCallProvider = "gemini" | "tavily";

export interface AiCallLogEntry {
  provider: AiCallProvider;
  /** Coarse operation name, e.g. "generate" or "search". */
  op: string;
  model?: string;
  /** Wall-clock duration in milliseconds. */
  ms: number;
  ok: boolean;
  /** Error message (truncated) when ok === false. */
  error?: string;
  meta?: Record<string, string | number | boolean | undefined>;
}

function truncate(value: string, max = 300): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** Emit one structured line. Never throws. */
export function logAiCall(entry: AiCallLogEntry): void {
  try {
    const ctx = getAiUsageContext();
    const payload = {
      tag: "ai_call",
      provider: entry.provider,
      op: entry.op,
      ...(entry.model ? { model: entry.model } : {}),
      ms: Math.round(entry.ms),
      ok: entry.ok,
      ...(entry.error ? { error: truncate(entry.error) } : {}),
      ...(ctx?.feature ? { feature: ctx.feature } : {}),
      ...(ctx?.userId ? { userId: ctx.userId } : {}),
      ...(entry.meta ?? {}),
    };
    const line = `[ai] ${JSON.stringify(payload)}`;
    if (entry.ok) console.info(line);
    else console.error(line);
  } catch {
    /* telemetry must never break the call path */
  }
}

/**
 * Time an AI/search call and emit a structured log line on both success and
 * failure. Re-throws the original error unchanged.
 */
export async function withAiCallLogging<T>(
  base: { provider: AiCallProvider; op: string; model?: string; meta?: AiCallLogEntry["meta"] },
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logAiCall({ ...base, ms: Date.now() - start, ok: true });
    return result;
  } catch (err) {
    logAiCall({
      ...base,
      ms: Date.now() - start,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
