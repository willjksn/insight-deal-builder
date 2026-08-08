import { NextRequest, NextResponse } from "next/server";
import { buildNextShootChecklist } from "@/lib/aiEditor/nextShootChecklist";
import { buildPlanningFeedback } from "@/lib/aiEditor/planningFeedback";
import { buildResolveSyncRecord } from "@/lib/aiEditor/resolveSync";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  createJob,
  getAiEditorProjectSettings,
  getCoverageReport,
  getTimeline,
  listMediaAssets,
  updateJob,
  upsertAiEditorProjectSettings,
} from "@/lib/aiEditor/server";
import type { ResolveSyncSnapshot } from "@/lib/aiEditor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  snapshot: ResolveSyncSnapshot;
};

/**
 * V5/V6/V8 — Resolve snapshot + planning feedback + next-shoot checklist.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const body = (await request.json()) as Body;
    if (!body.snapshot || typeof body.snapshot !== "object") {
      return NextResponse.json(
        { error: "Missing Resolve snapshot" },
        { status: 400 }
      );
    }

    const sync = buildResolveSyncRecord(body.snapshot);
    const [timeline, media, coverage, existingSettings] = await Promise.all([
      getTimeline(projectId),
      listMediaAssets(projectId),
      getCoverageReport(projectId),
      getAiEditorProjectSettings(projectId),
    ]);

    const planning = buildPlanningFeedback({
      sync,
      timeline,
      media,
      coverage,
    });

    const checklist = buildNextShootChecklist({
      feedback: planning,
      coverage,
      previous: existingSettings?.nextShootChecklist,
    });

    const created = await createJob(access.appUser, projectId, "resolve_sync", {
      timelineName: sync.timelineName,
      videoClipCount: sync.videoClipCount,
      durationFrames: sync.durationFrames,
      clipSampleCount: sync.clips?.length ?? 0,
      planningInsightCount: planning.insights.length,
      checklistCount: checklist.items.length,
    });

    const settings = await upsertAiEditorProjectSettings(projectId, {
      lastResolveSync: sync,
      lastPlanningFeedback: planning,
      nextShootChecklist: checklist,
    });

    const job = await updateJob(created.id, {
      status: "completed",
      progress: 100,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      message: sync.timelineName
        ? `Synced “${sync.timelineName}” · ${checklist.items.length} next-shoot item(s)`
        : `Synced from Resolve · ${checklist.items.length} next-shoot item(s)`,
    });

    return NextResponse.json({
      ok: true,
      sync,
      planning,
      checklist,
      settings,
      job,
    });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
