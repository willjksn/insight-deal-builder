import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasPermission } from "@/lib/utils/permissions";
import { restorePartnerUser } from "@/lib/users/archivePartner.server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    if (!hasPermission(appUser, "manageUsers")) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { id: targetUserId } = await params;
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const result = await restorePartnerUser(db, targetUserId, uid);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Restore failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
