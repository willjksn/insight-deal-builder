import { NextRequest, NextResponse } from "next/server";
import {
  assertApprovedUser,
  assertCanManageRevenueOpportunities,
  loadAppUser,
} from "@/lib/api/routeAuth";
import { exchangeGmailCode } from "@/lib/revenueOpportunities/gmail/oauth";
import { verifyGmailOAuthState } from "@/lib/revenueOpportunities/gmail/state";
import { saveGmailConnection } from "@/lib/revenueOpportunities/server/gmailConnection";
import { assertRevenueFeatureEnabled, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    assertRevenueFeatureEnabled();
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
    const appUser = await loadAppUser(parsed.userId);
    assertApprovedUser(appUser);
    assertCanManageRevenueOpportunities(appUser);
    if (appUser.company?.trim() !== parsed.organizationCompany) {
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
