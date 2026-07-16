import { aiUsesMock } from "@/lib/ai/mockAi";
import type { EmailProvider } from "@/lib/revenueOpportunities/providers";
import { mockEmailProvider } from "@/lib/revenueOpportunities/providers/index";
import { createLiveGmailProvider } from "@/lib/revenueOpportunities/providers/gmailProvider";
import { gmailConfigured } from "@/lib/revenueOpportunities/gmail/config";
import { getGmailConnection, requireGmailSecrets } from "@/lib/revenueOpportunities/server/gmailConnection";
import { AppUser } from "@/lib/types";

export type RevenueGmailMode = "not_configured" | "mock" | "live";

export function resolveGmailMode(): RevenueGmailMode {
  if (aiUsesMock()) return "mock";
  if (!gmailConfigured()) return "not_configured";
  return "live";
}

export async function getEmailProviderForUser(appUser: AppUser): Promise<{
  provider: EmailProvider;
  mode: RevenueGmailMode;
  connectedEmail?: string;
}> {
  const mode = resolveGmailMode();
  if (mode === "mock") {
    return { provider: mockEmailProvider, mode, connectedEmail: "demo@insightmediagroup.com" };
  }
  if (mode === "not_configured") {
    return { provider: mockEmailProvider, mode };
  }

  const conn = await getGmailConnection(appUser);
  if (!conn?.secrets?.refreshToken) {
    return { provider: mockEmailProvider, mode: "not_configured" };
  }

  return {
    provider: createLiveGmailProvider(appUser, { ...conn.secrets, email: conn.email }),
    mode: "live",
    connectedEmail: conn.email,
  };
}

export async function requireLiveEmailProvider(appUser: AppUser): Promise<{
  provider: EmailProvider;
  connectedEmail: string;
}> {
  const secrets = await requireGmailSecrets(appUser);
  return {
    provider: createLiveGmailProvider(appUser, secrets),
    connectedEmail: secrets.email,
  };
}
