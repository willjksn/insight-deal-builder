import { NextRequest, NextResponse } from "next/server";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  RESOLVE_HANDOFF_REL_DIR,
  buildHandoffFileMap,
} from "@/lib/aiEditor/resolveBridge";
import { buildResolveHandoff } from "@/lib/aiEditor/resolveExport";
import {
  createJob,
  getAiEditorProjectSettings,
  getTimeline,
  listMediaAssets,
  listTimelineVersions,
  updateJob,
} from "@/lib/aiEditor/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * V1G/V1.5 — portable Resolve handoff (EDL + JSON + companion scripts).
 * Does not upload camera media. Disk write / Open via Desktop Agent.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const [timeline, media, settings, versions] = await Promise.all([
      getTimeline(projectId),
      listMediaAssets(projectId),
      getAiEditorProjectSettings(projectId),
      listTimelineVersions(projectId),
    ]);

    if (!timeline) {
      return NextResponse.json(
        { error: "Build a rough cut before exporting to Resolve" },
        { status: 400 }
      );
    }

    const job = await createJob(access.appUser, projectId, "resolve_export", {
      timelineVersion: timeline.version,
    });
    await updateJob(job.id, {
      status: "running",
      progress: 40,
      startedAt: new Date().toISOString(),
      message: "Building Resolve handoff package",
    });

    const currentVersion = versions.find((v) => v.version === timeline.version);
    const handoff = buildResolveHandoff({
      projectId,
      timeline,
      media,
      projectRoot: settings?.projectRootPath,
      timelineVersionId: currentVersion?.id,
      editNotes: settings?.editNotes,
      finishingNote: settings?.lastFinishingFeedback?.note,
    });

    const manifest = {
      shootspineManifestVersion: handoff.shootspineManifestVersion,
      projectId: handoff.projectId,
      timelineId: handoff.timelineId,
      timelineVersionId: handoff.timelineVersionId,
      timelineName: timeline.name,
      timelineVersion: timeline.version,
      frameRate: timeline.frameRate,
      target: handoff.target,
      summary: handoff.summary,
      media: handoff.media,
      interchange: handoff.interchange,
      createdAt: new Date().toISOString(),
    };

    const files = buildHandoffFileMap({
      projectId,
      timelineName: timeline.name,
      edl: handoff.edl,
      manifestJson: JSON.stringify(
        {
          ...manifest,
          finishing: handoff.finishing ?? null,
        },
        null,
        2
      ),
      readme: handoff.readme,
      looksGuide: handoff.looksGuide,
    });

    const completedJob = await updateJob(job.id, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
      message: `Resolve package: ${handoff.summary.clipCount} clip(s), ${handoff.summary.durationTimecode}`,
    });

    return NextResponse.json({
      ok: true,
      job: completedJob,
      summary: handoff.summary,
      files,
      projectRootPath: settings?.projectRootPath ?? null,
      handoffRelativeDir: RESOLVE_HANDOFF_REL_DIR,
      handoff: {
        ...handoff,
        edl: undefined,
        readme: undefined,
      },
    });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
