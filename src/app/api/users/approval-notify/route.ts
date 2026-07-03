import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/notifications/server";
import { sendUserApprovedEmail } from "@/lib/email/userLifecycleEmail";
import { AppUser } from "@/lib/types";
import { canManageUsers, isLegacyInsightAdmin, resolvePermissions } from "@/lib/utils/permissions";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request.headers.get("authorization"));
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    }

    const callerSnap = await db.collection("users").doc(uid).get();
    if (!callerSnap.exists) {
      return NextResponse.json({ error: "Caller profile not found" }, { status: 403 });
    }
    const caller = { id: callerSnap.id, ...callerSnap.data() } as AppUser;
    const callerPerms = resolvePermissions(caller);
    if (!canManageUsers(caller) && !isLegacyInsightAdmin(caller)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = (await request.json()) as { userId?: string };
    if (!body.userId?.trim()) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const userSnap = await db.collection("users").doc(body.userId).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = { id: userSnap.id, ...userSnap.data() } as AppUser;
    if (user.approved === false) {
      return NextResponse.json({ ok: true, skipped: true, reason: "not_approved" });
    }
    if (!user.email?.trim()) {
      return NextResponse.json({ ok: true, skipped: true, reason: "no_email" });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const result = await sendUserApprovedEmail({
      to: user.email,
      displayName: user.displayName ?? user.email,
      appUrl,
    });

    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (err) {
    console.error("approval-notify error:", err);
    const message = err instanceof Error ? err.message : "Failed to send approval email";
    const status = message.includes("token") || message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
