import { NextRequest, NextResponse } from "next/server";
import { exchangeGmailCode } from "@/lib/revenueOpportunities/gmail/oauth";
import { verifyGmailOAuthState } from "@/lib/revenueOpportunities/gmail/state";
import { saveGmailConnection } from "@/lib/revenueOpportunities/server/gmailConnection";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");
    if (oauthError) {
      return NextResponse.redirect(new URL(`/revenue/settings?gmail=error&reason=${encodeURIComponent(oauthError)}`, request.url));
    }
    if (!code || !state) {
      return NextResponse.redirect(new URL("/revenue/settings?gmail=error&reason=missing_code", request.url));
    }

    const parsed = verifyGmailOAuthState(state);
    if (parsed.userId !== appUser.id || parsed.organizationCompany !== appUser.company?.trim()) {
      return NextResponse.redirect(new URL("/revenue/settings?gmail=error&reason=state_mismatch", request.url));
    }

    const tokens = await exchangeGmailCode(code);
    await saveGmailConnection(appUser, tokens);
    return NextResponse.redirect(new URL("/revenue/settings?gmail=connected", request.url));
  } catch (err) {
    const res = revenueApiError(err);
    const data = await res.json().catch(() => ({ error: "callback_failed" }));
    return NextResponse.redirect(
      new URL(`/revenue/settings?gmail=error&reason=${encodeURIComponent(String(data.error ?? "callback_failed"))}`, request.url)
    );
  }
}
