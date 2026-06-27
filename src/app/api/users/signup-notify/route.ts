import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/notifications/server";
import { notifyAdminsOfSignup } from "@/lib/notifications/signupNotify";
import { AppUser } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request.headers.get("authorization"));
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    }

    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const user = { id: userSnap.id, ...userSnap.data() } as AppUser;
    if (user.approved !== false) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const result = await notifyAdminsOfSignup({
      db,
      pendingUser: user,
      appUrl,
    });

    return NextResponse.json({ ok: true, notified: result.notified });
  } catch (err) {
    console.error("signup-notify error:", err);
    const message = err instanceof Error ? err.message : "Failed to notify admins";
    const status = message.includes("token") || message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
