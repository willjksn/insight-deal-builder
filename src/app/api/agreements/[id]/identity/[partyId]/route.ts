import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/notifications/server";
import { getPartyIdentityImageUrls } from "@/lib/signing/server";
import { hasPermission, isInsightOrgUser, resolvePermissions } from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string; partyId: string }> };

async function loadAppUser(uid: string): Promise<AppUser> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) throw new Error("User not found");
  return { id: userSnap.id, ...userSnap.data() } as AppUser;
}

function assertCanViewIdentity(appUser: AppUser): void {
  resolvePermissions(appUser);
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (!hasPermission(appUser, "viewIdentityDocs") && !hasPermission(appUser, "manageUsers")) {
    throw new Error("Not authorized to view ID verification");
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const uid = await verifyAuthToken(_request.headers.get("authorization"));
    const appUser = await loadAppUser(uid);
    assertCanViewIdentity(appUser);

    const { id: agreementId, partyId } = await context.params;
    const images = await getPartyIdentityImageUrls(agreementId, partyId);
    if (!images) {
      return NextResponse.json({ error: "No ID verification on file for this party" }, { status: 404 });
    }

    return NextResponse.json(images);
  } catch (err) {
    console.error("identity GET error:", err);
    const message = err instanceof Error ? err.message : "Failed to load ID verification";
    const status =
      message.includes("token") || message.includes("authorization") || message.includes("Not authorized")
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
