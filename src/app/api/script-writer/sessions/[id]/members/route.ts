import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import {
  listResourceMembers,
  listTeamUserCandidates,
  loadScriptSession,
  lookupUserByEmail,
  lookupUserById,
  normalizeEmail,
  RESOURCE_MEMBERS_SUBCOLLECTION,
  resolveScriptSessionAccess,
} from "@/lib/projectAccess/server";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";

export const runtime = "nodejs";

async function assertCanManageScriptShares(
  db: ReturnType<typeof getAdminDb>,
  sessionId: string,
  uid: string,
  appUser: Awaited<ReturnType<typeof requireApprovedAuthUser>>["appUser"]
) {
  if (!db) throw new Error("Firebase Admin is not configured");
  const session = await loadScriptSession(db, sessionId);
  if (!session) throw new Error("Session not found");
  if (session.userId !== uid) throw new Error("Not authorized to manage script sharing");
  return session;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { uid, appUser } = await requireApprovedAuthUser(request);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await loadScriptSession(db, sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const access = await resolveScriptSessionAccess(db, session, uid, appUser);
    if (!access.allowed) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const canManage = session.userId === uid;
    const members = canManage
      ? await listResourceMembers(db, SCRIPT_WRITER_SESSIONS_COLLECTION, sessionId)
      : [];
    const memberIds = new Set(members.map((m) => m.userId));
    if (session.userId) memberIds.add(session.userId);
    const candidates = canManage ? await listTeamUserCandidates(db, [...memberIds]) : [];

    return NextResponse.json({
      members,
      candidates,
      canManageSharing: canManage,
      linkedProjectId: session.linkedProjectId ?? session.appliedProjectId ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load sharing";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { uid, appUser } = await requireApprovedAuthUser(request);

    const body = (await request.json()) as { userId?: string; email?: string };

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    await assertCanManageScriptShares(db, sessionId, uid, appUser);

    const userId = body.userId?.trim();
    const email = body.email?.trim();
    if (!userId && !email) {
      return NextResponse.json({ error: "Select a person to share with." }, { status: 400 });
    }

    const user = userId
      ? await lookupUserById(db, userId)
      : await lookupUserByEmail(db, email!);
    if (!user) {
      return NextResponse.json(
        { error: "That person is not in the system yet. Have them sign up first." },
        { status: 404 }
      );
    }

    const member = stripUndefined({
      userId: user.id,
      email: normalizeEmail(user.email),
      displayName: user.displayName,
      permissions: { scripts: true, scout: false },
      addedByUserId: uid,
      addedAt: new Date().toISOString(),
    });

    await db
      .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(RESOURCE_MEMBERS_SUBCOLLECTION)
      .doc(user.id)
      .set(member, { merge: true });

    return NextResponse.json({
      ok: true,
      member: {
        ...member,
        accountApproved: user.accountApproved,
      },
      pendingApproval: user.pendingApproval,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to share script";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { uid, appUser } = await requireApprovedAuthUser(request);

    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    await assertCanManageScriptShares(db, sessionId, uid, appUser);

    await db
      .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(RESOURCE_MEMBERS_SUBCOLLECTION)
      .doc(userId)
      .delete();

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove access";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
