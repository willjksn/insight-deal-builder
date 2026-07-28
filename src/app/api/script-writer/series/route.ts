import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { assertScriptWriterAppAccess } from "@/lib/projectAccess/server";
import {
  createScriptSeries,
  listScriptSeries,
} from "@/lib/scriptWriter/series/server";
import { ScriptSeriesCreateInput } from "@/lib/scriptWriter/series/types";
import { canManageUsers } from "@/lib/utils/permissions";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    await assertScriptWriterAppAccess(db, uid, appUser);

    const series = await listScriptSeries(uid, appUser);
    return NextResponse.json({ series });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list series";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    await assertScriptWriterAppAccess(db, uid, appUser);

    const body = (await request.json().catch(() => ({}))) as ScriptSeriesCreateInput;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Series title is required" }, { status: 400 });
    }

    const series = await createScriptSeries(uid, body, {
      allowSpicy: canManageUsers(appUser),
    });
    return NextResponse.json({ ok: true, series });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create series";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
