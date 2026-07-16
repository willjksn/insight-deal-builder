import { NextRequest, NextResponse } from "next/server";
import { buildGmailAuthUrl } from "@/lib/revenueOpportunities/gmail/oauth";
import { gmailConfigured } from "@/lib/revenueOpportunities/gmail/config";
import { signGmailOAuthState } from "@/lib/revenueOpportunities/gmail/state";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    if (!gmailConfigured()) {
      throw new RevenueOpportunityError("GMAIL_NOT_CONFIGURED", "Google OAuth is not configured on this deployment");
    }
    const company = appUser.company?.trim();
    if (!company) throw new RevenueOpportunityError("NOT_AUTHORIZED", "Organization company is required");
    const state = signGmailOAuthState({ userId: appUser.id, organizationCompany: company });
    const url = buildGmailAuthUrl(state);
    return NextResponse.json({ url });
  } catch (err) {
    return revenueApiError(err);
  }
}
