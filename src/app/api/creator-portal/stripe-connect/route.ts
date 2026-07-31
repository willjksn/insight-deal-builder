import { NextRequest, NextResponse } from "next/server";
import {
  createCreatorStripeConnectDashboardLink,
  getCreatorConnectStatusForPortal,
  startCreatorStripeConnectOnboarding,
} from "@/lib/stripe/creatorConnect";
import { creatorApiError, requireCreatorPortalAccess } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorPortalAccess(request);
    const data = await getCreatorConnectStatusForPortal(appUser);
    return NextResponse.json(data);
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorPortalAccess(request);
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const action = body.action || "onboard";

    if (action === "status") {
      const data = await getCreatorConnectStatusForPortal(appUser);
      return NextResponse.json(data);
    }
    if (action === "onboard" || action === "refresh") {
      const result = await startCreatorStripeConnectOnboarding(appUser);
      return NextResponse.json(result);
    }
    if (action === "dashboard") {
      const result = await createCreatorStripeConnectDashboardLink(appUser);
      return NextResponse.json(result);
    }

    throw new CreatorError("VALIDATION_FAILED", "Unsupported Connect action");
  } catch (err) {
    return creatorApiError(err);
  }
}
