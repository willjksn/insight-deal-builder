import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  deliverClientSignedNotifications,
  partyHasSignature,
  verifyAuthToken,
} from "@/lib/notifications/server";
import { Agreement } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request.headers.get("authorization"));
    const body = await request.json();
    const { agreementId, partyId } = body as { agreementId?: string; partyId?: string };

    if (!agreementId || !partyId) {
      return NextResponse.json({ error: "agreementId and partyId are required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Server notification service not configured" }, { status: 503 });
    }

    const snap = await db.collection("agreements").doc(agreementId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    const agreement = { id: snap.id, ...snap.data() } as Agreement;
    const signingParty = agreement.parties.find((p) => p.id === partyId);

    if (!signingParty) {
      return NextResponse.json({ error: "Party not found on agreement" }, { status: 400 });
    }

    if (signingParty.type !== "client") {
      return NextResponse.json({ error: "Only client signatures trigger this notification" }, { status: 400 });
    }

    if (!partyHasSignature(agreement, partyId)) {
      return NextResponse.json({ error: "Party has not signed yet" }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const caller = adminAuth ? await adminAuth.getUser(uid) : null;
    const callerEmail = caller?.email?.toLowerCase();
    const isSigningParty =
      !!callerEmail &&
      (signingParty.email?.toLowerCase() === callerEmail ||
        agreement.accessKeys?.includes(`email:${callerEmail}`));
    const isCreator = agreement.createdBy === uid;

    if (!isSigningParty && !isCreator) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const result = await deliverClientSignedNotifications({
      agreement,
      signingParty,
      signerUserId: uid,
      appUrl,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("agreement-signed notification error:", err);
    const message = err instanceof Error ? err.message : "Notification failed";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
