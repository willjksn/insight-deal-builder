import { loadAiUsageMonthly } from "@/lib/ai/usageLog";
import { loadSearchMode } from "@/lib/search/searchMode";

/**
 * Lightweight per-month Tavily credit guard.
 *
 * When the current month's recorded Tavily credits approach the configured cap,
 * `assertTavilyBudget()` throws. The per-opportunity agents catch this and fall
 * back to rule-based mode; the campaign research pass surfaces the message so it
 * refuses to start an expensive multi-search run near the cap.
 *
 * Config (server env):
 * - TAVILY_MONTHLY_CREDIT_CAP     — plan credits/month (default 1000)
 * - TAVILY_MONTHLY_CREDIT_RESERVE — stop this many credits before the cap (default 20)
 */

export class TavilyBudgetError extends Error {
  readonly code = "TAVILY_BUDGET_EXCEEDED";
  constructor(message: string) {
    super(message);
    this.name = "TavilyBudgetError";
  }
}

export function tavilyMonthlyCap(): number {
  const raw = Number(process.env.TAVILY_MONTHLY_CREDIT_CAP);
  return Number.isFinite(raw) && raw > 0 ? raw : 1000;
}

function tavilyReserve(): number {
  const raw = Number(process.env.TAVILY_MONTHLY_CREDIT_RESERVE);
  return Number.isFinite(raw) && raw >= 0 ? raw : 20;
}

/** Pure threshold check — exported for testing. */
export function tavilyBudgetExhausted(used: number, cap: number, reserve: number): boolean {
  if (cap <= 0) return false; // 0/negative cap disables the guard
  return used >= Math.max(0, cap - reserve);
}

// Short in-memory cache so we don't read Firestore on every single search.
let cache: { credits: number; at: number } | null = null;
const CACHE_TTL_MS = 60_000;

/** Reset the cached credit count (used in tests). */
export function resetTavilyBudgetCache(): void {
  cache = null;
}

async function creditsUsedThisMonth(): Promise<number> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.credits;
  const usage = await loadAiUsageMonthly();
  const credits = usage?.tavilyCredits ?? 0;
  cache = { credits, at: now };
  return credits;
}

/**
 * Optimistically bump the cached total after a successful search so that
 * later searches within the same flow (before the async Firestore write lands)
 * see the growing total and stop at the cap.
 */
export function noteTavilyCreditsSpent(credits: number): void {
  if (cache) cache.credits += credits;
}

export interface TavilyBudgetStatus {
  used: number;
  cap: number;
  remaining: number;
  exhausted: boolean;
}

export async function tavilyBudgetStatus(): Promise<TavilyBudgetStatus> {
  const cap = tavilyMonthlyCap();
  const used = await creditsUsedThisMonth();
  return {
    used,
    cap,
    remaining: Math.max(0, cap - used),
    exhausted: tavilyBudgetExhausted(used, cap, tavilyReserve()),
  };
}

/**
 * Throw a TavilyBudgetError when live search should be skipped:
 * - the admin has turned on lightweight (rule-only) mode, or
 * - the automatic credit guard is enabled and the monthly cap is (nearly) reached.
 */
export async function assertTavilyBudget(): Promise<void> {
  const mode = await loadSearchMode();

  // Manual override: always fall back to rules, regardless of remaining credits.
  if (mode.lightweightMode) {
    throw new TavilyBudgetError(
      "Lightweight search mode is on — using rule-based mode instead of live web search. " +
        "Turn it off in Admin → Search mode to re-enable Tavily."
    );
  }

  // Automatic near-cap guard (opt-out via Admin → Search mode).
  if (!mode.autoCreditGuard) return;

  const cap = tavilyMonthlyCap();
  if (cap <= 0) return;
  const used = await creditsUsedThisMonth();
  if (tavilyBudgetExhausted(used, cap, tavilyReserve())) {
    throw new TavilyBudgetError(
      `Tavily monthly credit cap reached (${used}/${cap} used). ` +
        `Falling back to rule-based mode. Raise TAVILY_MONTHLY_CREDIT_CAP or wait until next month.`
    );
  }
}
