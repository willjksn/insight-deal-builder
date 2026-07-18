import { aiUsesMock } from "@/lib/ai/mockAi";

export function n8nBaseUrl(): string | undefined {
  const raw = process.env.N8N_BASE_URL?.trim();
  return raw?.replace(/\/+$/, "") || undefined;
}

export function n8nWebhookSecret(): string | undefined {
  return process.env.N8N_WEBHOOK_SECRET?.trim() || undefined;
}

export function n8nApiKey(): string | undefined {
  return process.env.N8N_API_KEY?.trim() || undefined;
}

export function n8nConfigured(): boolean {
  return Boolean(n8nBaseUrl() && n8nWebhookSecret());
}

export type RevenueN8nMode = "not_configured" | "mock" | "live";

export function resolveN8nMode(): RevenueN8nMode {
  if (n8nConfigured()) return "live";
  if (aiUsesMock() || process.env.REVENUE_N8N_MOCK === "true") return "mock";
  return "not_configured";
}

/** Organization company for scheduled cron triggers (IMG tenant). */
export function revenueCronOrganizationCompany(): string {
  return process.env.REVENUE_CRON_ORGANIZATION_COMPANY?.trim() || "Insight Media Group LLC";
}
