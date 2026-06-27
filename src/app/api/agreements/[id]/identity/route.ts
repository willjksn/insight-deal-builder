import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/notifications/server";
import {
  applyStaffIdentityCapture,
  getPartyIdentityImageUrls,
} from "@/lib/signing/server";
import { hasPermission, isInsightOrgUser, resolvePermissions } from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

async function loadAppUser(uid: string): Promise<AppUser> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) throw new Error("User not found");
  return { id: userSnap.id, ...userSnap.data() } as AppUser;
}

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
    const uid = await verifyAuthToken(request.headers.get("authorization"));
    const appUser = await loadAppUser(uid);
    assertCanCaptureIdentity(appUser);

    const { id: agreementId } = await context.params;
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
    const status =
      message.includes("token") || message.includes("authorization") || message.includes("Not authorized")
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
