import { NextRequest, NextResponse } from "next/server";
import { loadAgreementForUser } from "@/lib/agreement/serverAccess";
import { apiErrorStatus, assertCanViewIdentity, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { getPartyIdentityMetadata } from "@/lib/identity/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; partyId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanViewIdentity(appUser);

    const { id: agreementId, partyId } = await context.params;
    await loadAgreementForUser(agreementId, appUser);
    const meta = await getPartyIdentityMetadata(agreementId, partyId);
    if (!meta) {
      return NextResponse.json({ error: "No ID verification on file for this party" }, { status: 404 });
    }

    return NextResponse.json({
      capturedAt: meta.capturedAt,
      capturedBy: meta.capturedBy,
    });
  } catch (err) {
    console.error("identity GET error:", err);
    const message = err instanceof Error ? err.message : "Failed to load ID verification";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
