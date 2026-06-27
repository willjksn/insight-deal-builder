import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/notifications/server";
import { createSigningLink, getSigningLinkUrl } from "@/lib/signing/server";
import { hasPermission, resolvePermissions } from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

async function assertCanManageLinks(uid: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Server not configured");

  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) throw new Error("User not found");

  const appUser = { id: userSnap.id, ...userSnap.data() } as AppUser;
  const perms = resolvePermissions(appUser);
  if (!hasPermission(appUser, "editQuotes") && !hasPermission(appUser, "createQuotes")) {
    throw new Error("Not authorized to create signing links");
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request.headers.get("authorization"));
    await assertCanManageLinks(uid);

    const body = await request.json();
    const { agreementId, partyId } = body as { agreementId?: string; partyId?: string };

    if (!agreementId || !partyId) {
      return NextResponse.json({ error: "agreementId and partyId are required" }, { status: 400 });
    }

    const { token, expiresAt } = await createSigningLink({
      agreementId,
      partyId,
      createdBy: uid,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const url = getSigningLinkUrl(token, appUrl);

    return NextResponse.json({
      token,
      url,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("create signing link error:", err);
    const message = err instanceof Error ? err.message : "Failed to create signing link";
    const status =
      message.includes("token") || message.includes("authorization") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
