import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { SHOOT_GUIDES_COLLECTION } from "@/lib/shootGuide/collections";
import { createGuideDocument, normalizeCreateInput } from "@/lib/shootGuide/defaults";
import type { ShootGuideCreateInput } from "@/lib/shootGuide/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function updatedAtMs(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === "string" || typeof value === "number") {
    const n = new Date(value).getTime();
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function isIndexBuildingError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("FAILED_PRECONDITION") ||
    message.includes("requires an index") ||
    message.includes("currently building")
  );
}

export async function GET(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const col = db.collection(SHOOT_GUIDES_COLLECTION);
    let guides: Array<{ id: string; [key: string]: unknown }>;

    try {
      const snap = await col
        .where("userId", "==", uid)
        .orderBy("updatedAt", "desc")
        .limit(60)
        .get();
      guides = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      if (!isIndexBuildingError(err)) throw err;
      const snap = await col.where("userId", "==", uid).limit(80).get();
      guides = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as { id: string; [key: string]: unknown })
        .sort((a, b) => updatedAtMs(b.updatedAt) - updatedAtMs(a.updatedAt))
        .slice(0, 60);
    }

    return NextResponse.json({ guides });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list shoot guides";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const body = (await request.json()) as ShootGuideCreateInput;
    const normalized = normalizeCreateInput(body);

    if (normalized.sourceType === "quick_scene" && !normalized.prompt) {
      return NextResponse.json(
        { error: "Describe the scene to generate a Quick Scene guide." },
        { status: 400 }
      );
    }
    if (normalized.sourceType === "script" && !normalized.sourceScriptId) {
      return NextResponse.json(
        { error: "Select an existing script or scene." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const payload = createGuideDocument(uid, body);
    const ref = await db.collection(SHOOT_GUIDES_COLLECTION).add(
      stripUndefined({
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    const snap = await ref.get();
    return NextResponse.json({ guide: { id: ref.id, ...snap.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create shoot guide";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
