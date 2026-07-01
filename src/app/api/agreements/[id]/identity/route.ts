import { NextRequest, NextResponse } from "next/server";
import { loadAgreementForUser } from "@/lib/agreement/serverAccess";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { applyStaffIdentityCapture } from "@/lib/signing/server";
import { hasPermission, isInsightOrgUser, resolvePermissions } from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function assertCanCaptureIdentity(appUser: AppUser): void {
  resolvePermissions(appUser);
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (
    !hasPermission(appUser, "viewIdentityDocs") &&
    !hasPermission(appUser, "signQuotes") &&
    !hasPermission(appUser, "editQuotes")
  ) {
    throw new Error("Not authorized to capture ID verification");
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanCaptureIdentity(appUser);

    const { id: agreementId } = await context.params;
    await loadAgreementForUser(agreementId, appUser);

    const body = await request.json();
    const partyId = typeof body.partyId === "string" ? body.partyId : "";
    const idFrontDataUrl = typeof body.idFrontDataUrl === "string" ? body.idFrontDataUrl : "";
    const idBackDataUrl = typeof body.idBackDataUrl === "string" ? body.idBackDataUrl : "";
    const consentGiven = body.consentGiven === true;

    if (!partyId || !idFrontDataUrl || !idBackDataUrl) {
      return NextResponse.json({ error: "partyId and both ID images are required" }, { status: 400 });
    }

    const agreement = await applyStaffIdentityCapture(
      agreementId,
      partyId,
      idFrontDataUrl,
      idBackDataUrl,
      consentGiven,
      uid
    );

    return NextResponse.json({ agreement });
  } catch (err) {
    console.error("identity POST error:", err);
    const message = err instanceof Error ? err.message : "Failed to save ID verification";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
