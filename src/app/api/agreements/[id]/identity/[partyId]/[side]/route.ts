import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/notifications/server";
import { downloadIdentityImage } from "@/lib/identity/storage";
import { hasPermission, isInsightOrgUser, resolvePermissions } from "@/lib/utils/permissions";
import { Agreement, AppUser } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string; partyId: string; side: string }> };

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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const uid = await verifyAuthToken(request.headers.get("authorization"));
    const appUser = await loadAppUser(uid);
    assertCanViewIdentity(appUser);

    const { id: agreementId, partyId, side } = await context.params;
    if (side !== "front" && side !== "back") {
      return NextResponse.json({ error: "Invalid side" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    }

    const agreementSnap = await db.collection("agreements").doc(agreementId).get();
    if (!agreementSnap.exists) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    const agreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;
    const record = (agreement.identityVerifications ?? []).find((v) => v.partyId === partyId);
    const storagePath =
      side === "front" ? record?.idFrontStoragePath : record?.idBackStoragePath;
    if (!storagePath) {
      return NextResponse.json({ error: "ID image not found" }, { status: 404 });
    }

    const { buffer, contentType } = await downloadIdentityImage(storagePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("identity image GET error:", err);
    const message = err instanceof Error ? err.message : "Failed to load ID image";
    const status =
      message.includes("token") || message.includes("authorization") || message.includes("Not authorized")
        ? 401
        : message.includes("not configured")
          ? 503
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
