import { NextRequest, NextResponse } from "next/server";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import { applyFinishingPlan } from "@/lib/aiEditor/finishing";
import {
  setActiveReel,
  setupFeatureReels,
} from "@/lib/aiEditor/reels";
import {
  applyTimelineOps,
  buildRoughCutFromCoverage,
  bumpVersion,
  makeTimelineVersion,
  summarizeTimeline,
} from "@/lib/aiEditor/timeline";
import {
  createJob,
  getCoverageReport,
  getTimeline,
  listMediaAssets,
  listTimelineVersions,
  saveTimelineVersion,
  updateJob,
  upsertTimeline,
} from "@/lib/aiEditor/server";
import type {
  FinishingMoodId,
  TimelineEditOp,
  TransitionStyleId,
} from "@/lib/aiEditor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const [timeline, versions] = await Promise.all([
      getTimeline(projectId),
      listTimelineVersions(projectId),
    ]);
    return NextResponse.json({
      timeline,
      versions,
      summary: timeline ? summarizeTimeline(timeline) : null,
    });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}

/**
 * V1E — build rough cut from coverage, apply ops, or restore a version.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const body = (await request.json()) as {
      action?:
        | "build_rough_cut"
        | "apply_ops"
        | "restore_version"
        | "apply_finishing"
        | "setup_feature_reels"
        | "set_active_reel";
      ops?: TimelineEditOp[];
      versionId?: string;
      note?: string;
      name?: string;
      moodId?: FinishingMoodId;
      transitionStyle?: TransitionStyleId;
      reelId?: string;
      /** acts (default) or reels (~20 min) */
      reelMode?: "acts" | "reels";
      runtimeSeconds?: number;
      reelCount?: number;
    };
    const action = body.action || "build_rough_cut";

    const jobType =
      action === "apply_finishing"
        ? "finishing"
        : action === "setup_feature_reels" || action === "set_active_reel"
          ? "rough_cut"
          : "rough_cut";
    const job = await createJob(access.appUser, projectId, jobType, { action });
    await updateJob(job.id, {
      status: "running",
      progress: 15,
      startedAt: new Date().toISOString(),
      message: `Timeline: ${action}`,
    });

    let timeline = await getTimeline(projectId);

    if (action === "setup_feature_reels") {
      if (!timeline) {
        return NextResponse.json({ error: "Build a rough cut first" }, { status: 400 });
      }
      const structured = setupFeatureReels(timeline, {
        mode: body.reelMode || "acts",
        runtimeSeconds: body.runtimeSeconds,
        reelCount: body.reelCount,
      });
      const { timeline: bumped, versionRecord } = bumpVersion(
        structured,
        body.note ||
          (body.reelMode === "reels"
            ? "Split into reels for long-form"
            : "Split into acts for feature (~1h45)")
      );
      timeline = bumped;
      await upsertTimeline(timeline);
      await saveTimelineVersion(versionRecord);
    } else if (action === "set_active_reel") {
      if (!timeline) {
        return NextResponse.json({ error: "Build a rough cut first" }, { status: 400 });
      }
      if (!body.reelId) {
        return NextResponse.json({ error: "reelId required" }, { status: 400 });
      }
      // Active reel focus — no version bump (organizational only)
      timeline = setActiveReel(timeline, body.reelId);
      await upsertTimeline(timeline);
    } else if (action === "apply_finishing") {
      if (!timeline) {
        return NextResponse.json({ error: "Build a rough cut first" }, { status: 400 });
      }
      if (!body.moodId || !body.transitionStyle) {
        return NextResponse.json(
          { error: "Choose a look and how clips should connect" },
          { status: 400 }
        );
      }
      const applied = applyFinishingPlan(timeline, {
        moodId: body.moodId,
        transitionStyle: body.transitionStyle,
      });
      const { timeline: bumped, versionRecord } = bumpVersion(
        applied.timeline,
        body.note || `Look: ${applied.plan.moodLabel} · ${applied.plan.transitionLabel}`
      );
      timeline = bumped;
      await upsertTimeline(timeline);
      await saveTimelineVersion(versionRecord);
    } else if (action === "build_rough_cut") {
      const [coverage, media] = await Promise.all([
        getCoverageReport(projectId),
        listMediaAssets(projectId),
      ]);
      if (!coverage && !media.length) {
        await updateJob(job.id, {
          status: "failed",
          error: "No coverage or media to assemble",
          completedAt: new Date().toISOString(),
        });
        return NextResponse.json(
          { error: "Run matching or add clips first" },
          { status: 400 }
        );
      }
      timeline = buildRoughCutFromCoverage({
        projectId,
        coverage: coverage || {
          projectId,
          updatedAt: new Date().toISOString(),
          plannedShotCount: 0,
          coveredCount: 0,
          partialCount: 0,
          missingCount: 0,
          unmatchedMediaIds: [],
          shots: [],
          overrides: [],
        },
        media,
        name: body.name,
      });
      const existing = await getTimeline(projectId);
      if (existing) {
        timeline = { ...timeline, version: existing.version + 1 };
      }
      const versionRecord = makeTimelineVersion(
        timeline,
        body.note || "Rough cut from coverage"
      );
      await upsertTimeline(timeline);
      await saveTimelineVersion(versionRecord);
    } else if (action === "apply_ops") {
      if (!timeline) {
        return NextResponse.json({ error: "No timeline yet" }, { status: 400 });
      }
      if (!Array.isArray(body.ops) || !body.ops.length) {
        return NextResponse.json({ error: "ops required" }, { status: 400 });
      }
      const applied = applyTimelineOps(timeline, body.ops);
      const { timeline: bumped, versionRecord } = bumpVersion(
        applied,
        body.note || `Applied ${body.ops.length} edit(s)`
      );
      timeline = bumped;
      await upsertTimeline(timeline);
      await saveTimelineVersion(versionRecord);
    } else if (action === "restore_version") {
      if (!body.versionId) {
        return NextResponse.json({ error: "versionId required" }, { status: 400 });
      }
      const versions = await listTimelineVersions(projectId);
      const hit = versions.find((v) => v.id === body.versionId);
      if (!hit) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }
      const restored = {
        ...hit.snapshot,
        projectId,
        id: projectId,
        updatedAt: new Date().toISOString(),
      };
      const { timeline: bumped, versionRecord } = bumpVersion(
        restored,
        body.note || `Restored v${hit.version}`
      );
      timeline = bumped;
      await upsertTimeline(timeline);
      await saveTimelineVersion(versionRecord);
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const completedJob = await updateJob(job.id, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
      message:
        action === "apply_finishing" && timeline.finishing
          ? `${timeline.finishing.moodLabel} · ${timeline.finishing.transitionLabel} (v${timeline.version})`
          : `Timeline v${timeline.version} saved`,
    });

    const versions = await listTimelineVersions(projectId);
    return NextResponse.json({
      ok: true,
      timeline,
      versions,
      summary: summarizeTimeline(timeline),
      job: completedJob,
    });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
