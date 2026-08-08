import { NextRequest, NextResponse } from "next/server";
import { buildPlanningFeedback } from "@/lib/aiEditor/planningFeedback";
import { buildResolveSyncRecord } from "@/lib/aiEditor/resolveSync";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  createJob,
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
 * V5/V6 — persist Resolve timeline snapshot + planning feedback vs rough cut.
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
    const [timeline, media, coverage] = await Promise.all([
      getTimeline(projectId),
      listMediaAssets(projectId),
      getCoverageReport(projectId),
    ]);

    const planning = buildPlanningFeedback({
      sync,
      timeline,
      media,
      coverage,
    });

    const created = await createJob(access.appUser, projectId, "resolve_sync", {
      timelineName: sync.timelineName,
      videoClipCount: sync.videoClipCount,
      durationFrames: sync.durationFrames,
      clipSampleCount: sync.clips?.length ?? 0,
      planningInsightCount: planning.insights.length,
    });

    const settings = await upsertAiEditorProjectSettings(projectId, {
      lastResolveSync: sync,
      lastPlanningFeedback: planning,
    });

    const job = await updateJob(created.id, {
      status: "completed",
      progress: 100,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      message: sync.timelineName
        ? `Synced “${sync.timelineName}” · ${planning.insights.length} planning note(s)`
        : `Synced from Resolve · ${planning.insights.length} planning note(s)`,
    });

    return NextResponse.json({ ok: true, sync, planning, settings, job });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
