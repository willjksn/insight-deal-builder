import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { CONTENT_PLANS_COLLECTION } from "@/lib/contentPlan/collections";
import { IDEA_SESSIONS_COLLECTION } from "@/lib/contentIdeas/collections";
import {
  defaultContentPlanInputs,
  emptyProgress,
  type ContentPlanInputs,
  DURATION_OPTIONS,
} from "@/lib/contentPlan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeInputs(raw: Partial<ContentPlanInputs>): ContentPlanInputs {
  const base = defaultContentPlanInputs(raw);
  const preset = DURATION_OPTIONS.find((d) => d.value === base.durationPreset);
  if (base.durationPreset !== "custom" && preset) {
    base.durationSeconds = preset.seconds;
  } else if (!base.durationSeconds || base.durationSeconds < 5) {
    base.durationSeconds = 30;
  }
  base.idea = String(base.idea || "").trim();
  base.useAvailableGearOnly = Boolean(base.useAvailableGearOnly);
  base.teachMe = Boolean(base.teachMe);
  return base;
}

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

    const col = db.collection(CONTENT_PLANS_COLLECTION);
    let plans: Array<{ id: string; [key: string]: unknown }>;

    try {
      const snap = await col
        .where("userId", "==", uid)
        .orderBy("updatedAt", "desc")
        .limit(40)
        .get();
      plans = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      // Composite index may still be building after deploy — fall back to equality-only.
      if (!isIndexBuildingError(err)) throw err;
      const snap = await col.where("userId", "==", uid).limit(80).get();
      plans = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as { id: string; [key: string]: unknown })
        .sort((a, b) => updatedAtMs(b.updatedAt) - updatedAtMs(a.updatedAt))
        .slice(0, 40);
    }

    return NextResponse.json({ plans });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list content plans";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const body = (await request.json()) as {
      inputs?: Partial<ContentPlanInputs>;
      title?: string;
      sourceIdeaSessionId?: string | null;
      sourceIdeaId?: string | null;
    };
    const inputs = normalizeInputs(body.inputs || {});
    if (!inputs.idea) {
      return NextResponse.json({ error: "Idea is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const sourceIdeaSessionId = body.sourceIdeaSessionId?.trim() || null;
    const sourceIdeaId = body.sourceIdeaId?.trim() || null;

    const ref = await db.collection(CONTENT_PLANS_COLLECTION).add(
      stripUndefined({
        userId: uid,
        projectId: null,
        creatorId: inputs.creatorId || null,
        scriptSessionId: null,
        sourceIdeaSessionId,
        sourceIdeaId,
        title: body.title?.trim() || "Untitled content plan",
        status: "draft",
        inputs,
        creativeBrief: null,
        beats: [],
        scriptLines: [],
        shots: [],
        progress: emptyProgress(),
        lastError: null,
        teachMe: inputs.teachMe,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    // Best-effort: mark the Weekly Idea as developed into a content plan.
    if (sourceIdeaSessionId && sourceIdeaId) {
      try {
        const sessionRef = db.collection(IDEA_SESSIONS_COLLECTION).doc(sourceIdeaSessionId);
        const sessionSnap = await sessionRef.get();
        if (sessionSnap.exists && sessionSnap.data()?.userId === uid) {
          const ideas = Array.isArray(sessionSnap.data()?.ideas)
            ? [...sessionSnap.data()!.ideas]
            : [];
          const idx = ideas.findIndex(
            (i: { id?: string }) => i?.id === sourceIdeaId
          );
          if (idx >= 0) {
            ideas[idx] = {
              ...ideas[idx],
              contentPlanId: ref.id,
              status:
                ideas[idx].status === "converted_to_project"
                  ? ideas[idx].status
                  : "developed_in_content_plan",
            };
            await sessionRef.set(
              { ideas, updatedAt: FieldValue.serverTimestamp() },
              { merge: true }
            );
          }
        }
      } catch {
        // Non-fatal provenance write.
      }
    }

    const snap = await ref.get();
    return NextResponse.json({ plan: { id: ref.id, ...snap.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create content plan";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
