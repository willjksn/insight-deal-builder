import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  deleteScriptSeries,
  getScriptSeries,
  listSeriesEntries,
  updateScriptSeries,
} from "@/lib/scriptWriter/series/server";
import { ScriptSeriesUpdateInput } from "@/lib/scriptWriter/series/types";
import { canManageUsers } from "@/lib/utils/permissions";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const { id } = await params;
    if (!getAdminDb()) throw new Error("Firebase Admin is not configured");

    const series = await getScriptSeries(id, uid, appUser);
    const entries = await listSeriesEntries(id);
    return NextResponse.json({ series, entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load series";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const { id } = await params;
    if (!getAdminDb()) throw new Error("Firebase Admin is not configured");

    const body = (await request.json().catch(() => ({}))) as ScriptSeriesUpdateInput;
    const series = await updateScriptSeries(id, uid, appUser, body, {
      allowSpicy: canManageUsers(appUser),
    });
    return NextResponse.json({ ok: true, series });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update series";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const { id } = await params;
    if (!getAdminDb()) throw new Error("Firebase Admin is not configured");

    await deleteScriptSeries(id, uid, appUser);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete series";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
