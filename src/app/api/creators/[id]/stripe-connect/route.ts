import { NextRequest, NextResponse } from "next/server";
import { syncCreatorStripeConnectAccount } from "@/lib/stripe/creatorConnect";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { redactCreatorForViewer } from "@/lib/creators/server";
import { CreatorError } from "@/lib/creators/errors";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const action = body.action || "sync";

    if (action !== "sync") {
      throw new CreatorError("VALIDATION_FAILED", "Unsupported Connect action");
    }

    const creator = await syncCreatorStripeConnectAccount(id);
    return NextResponse.json({ creator: redactCreatorForViewer(creator, appUser) });
  } catch (err) {
    return creatorApiError(err);
  }
}
