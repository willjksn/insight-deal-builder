import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { AI_EDITOR_PROJECT_SETTINGS_COLLECTION } from "@/lib/aiEditor/collections";
import {
  buildCrossProjectInsights,
  type CrossProjectSource,
} from "@/lib/aiEditor/crossProjectInsights";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type { AiEditorProjectSettings } from "@/lib/aiEditor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * V10 — patterns across the user's AI Editor projects (settings metadata only).
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAiEditorEnabled()) {
      return NextResponse.json({ error: "AI Editor is disabled" }, { status: 404 });
    }
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const snap = await db
      .collection("projects")
      .where("ownerUserId", "==", uid)
      .limit(80)
      .get();

    const projects = snap.docs.map((d) => ({
      projectId: d.id,
      projectName: String(d.data().projectName || "Untitled"),
    }));

    const sources: CrossProjectSource[] = [];
    const chunkSize = 30;
    for (let i = 0; i < projects.length; i += chunkSize) {
      const chunk = projects.slice(i, i + chunkSize);
      const refs = chunk.map((p) =>
        db.collection(AI_EDITOR_PROJECT_SETTINGS_COLLECTION).doc(p.projectId)
      );
      if (!refs.length) continue;
      const docs = await db.getAll(...refs);
      const byId = new Map(
        docs
          .filter((d) => d.exists)
          .map((d) => [
            d.id,
            serializeDoc<AiEditorProjectSettings>(d.id, d.data()!),
          ])
      );
      for (const p of chunk) {
        sources.push({
          projectId: p.projectId,
          projectName: p.projectName,
          settings: byId.get(p.projectId) || null,
        });
      }
    }

    const summary = buildCrossProjectInsights(sources);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load insights";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
