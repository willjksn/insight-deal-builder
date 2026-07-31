import { NextRequest, NextResponse } from "next/server";
import {
  getIdentityDocumentViewUrl,
  reviewCreatorIdentityVerification,
} from "@/lib/creators/identityVerificationServer";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { redactCreatorForViewer } from "@/lib/creators/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: string;
      rejectionReason?: string;
      side?: "front" | "back";
    };

    if (body.action === "view") {
      const side = body.side === "back" ? "back" : "front";
      const result = await getIdentityDocumentViewUrl(appUser, id, side);
      return NextResponse.json(result);
    }

    if (body.action === "approve" || body.action === "reject") {
      const creator = await reviewCreatorIdentityVerification(appUser, id, {
        action: body.action,
        rejectionReason: body.rejectionReason,
      });
      return NextResponse.json({ creator: redactCreatorForViewer(creator, appUser) });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    return creatorApiError(err);
  }
}
