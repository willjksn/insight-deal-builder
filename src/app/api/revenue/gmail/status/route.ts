import { NextRequest, NextResponse } from "next/server";
import { disconnectGmail, getGmailConnection } from "@/lib/revenueOpportunities/server/gmailConnection";
import { resolveGmailMode } from "@/lib/revenueOpportunities/providers/getEmailProvider";
import { gmailConfigured } from "@/lib/revenueOpportunities/gmail/config";
import { requireRevenueManager, requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const conn = await getGmailConnection(appUser);
    return NextResponse.json({
      configured: gmailConfigured(),
      mode: resolveGmailMode(),
      connected: Boolean(conn?.email),
      email: conn?.email,
      connectedAt: conn?.connectedAt,
    });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    await disconnectGmail(appUser);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return revenueApiError(err);
  }
}
