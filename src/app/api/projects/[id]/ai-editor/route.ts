import { NextRequest, NextResponse } from "next/server";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import { loadProductionContext } from "@/lib/aiEditor/productionContextServer";
import {
  getAiEditorProjectSettings,
  getCoverageReport,
  getTimeline,
  listAnalysisBundles,
  listJobs,
  listMediaAssets,
  listStorageLocations,
  listTimelineVersions,
} from "@/lib/aiEditor/server";
import { summarizeTimeline } from "@/lib/aiEditor/timeline";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const [settings, storage, media, jobs, context, analysis, coverage, timeline, timelineVersions] =
      await Promise.all([
        getAiEditorProjectSettings(projectId),
        listStorageLocations(access.uid),
        listMediaAssets(projectId),
        listJobs(projectId),
        loadProductionContext(projectId),
        listAnalysisBundles(projectId),
        getCoverageReport(projectId),
        getTimeline(projectId),
        listTimelineVersions(projectId),
      ]);

    return NextResponse.json({
      settings,
      storage,
      media,
      jobs,
      context,
      analysis,
      coverage,
      timeline,
      timelineVersions,
      timelineSummary: timeline ? summarizeTimeline(timeline) : null,
    });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
