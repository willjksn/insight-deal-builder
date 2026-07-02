import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireScoutProjectAccess } from "@/lib/scout/scoutRouteAuth";
import { workspaceAccessFromRequest } from "@/lib/projectAccess/requestAccess";
import { notifyOwnerOfSharedResourceNote } from "@/lib/notifications/sharedNoteNotify";
import {
  createSharedResourceNote,
  listSharedResourceNotes,
  touchResourceUpdatedAt,
} from "@/lib/sharedNotes/server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scoutId } = await params;
    const { uid, appUser, project } = await requireScoutProjectAccess(request, scoutId);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const { options, adminEmail } = workspaceAccessFromRequest(request, appUser);
    const result = await listSharedResourceNotes({
      db,
      resourceType: "scout",
      resource: project,
      uid,
      appUser,
      options,
      adminEmail,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load notes";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scoutId } = await params;
    const { uid, appUser, project } = await requireScoutProjectAccess(request, scoutId);
    const body = (await request.json()) as { body?: string };

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const { options, adminEmail } = workspaceAccessFromRequest(request, appUser);
    const note = await createSharedResourceNote({
      db,
      resourceType: "scout",
      resource: project,
      uid,
      appUser,
      body: body.body ?? "",
      options,
      adminEmail,
    });

    await touchResourceUpdatedAt(db, "scout", scoutId);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    await notifyOwnerOfSharedResourceNote({
      db,
      resourceType: "scout",
      resource: project,
      note,
      authorAppUser: appUser,
      appUrl,
    });

    const result = await listSharedResourceNotes({
      db,
      resourceType: "scout",
      resource: project,
      uid,
      appUser,
      options,
      adminEmail,
    });

    return NextResponse.json({ note, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to post note";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
