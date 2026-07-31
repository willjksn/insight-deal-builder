import { NextRequest, NextResponse } from "next/server";
import { voidCreatorNetworkAgreement } from "@/lib/creators/networkAgreementServer";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "void") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
    const creator = await voidCreatorNetworkAgreement(appUser, id);
    return NextResponse.json({ creator });
  } catch (err) {
    return creatorApiError(err);
  }
}
