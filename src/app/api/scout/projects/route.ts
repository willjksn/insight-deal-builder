import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus, assertCanUseShotScout, requireAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireAuthUser(request);
    assertCanUseShotScout(appUser);

    const body = (await request.json()) as Record<string, unknown>;
    if (body.userId !== uid) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const ref = await db.collection("shotScoutProjects").add({
      ...stripUndefined(body),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create scout session";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
