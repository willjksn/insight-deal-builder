import { NextRequest, NextResponse } from "next/server";
import type { ClipAnalysisBundle, ShotSegment, TranscriptSegment } from "@/lib/aiEditor/analysis";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  createJob,
  listMediaAssets,
  updateJob,
  upsertAnalysisBundle,
  upsertMediaAssets,
} from "@/lib/aiEditor/server";

export const runtime = "nodejs";
export const maxDuration = 300;

type IncomingBundle = {
  mediaAssetId: string;
  technical?: ClipAnalysisBundle["technical"];
  shots?: Array<Omit<ShotSegment, "id" | "mediaAssetId"> & { id?: string }>;
  transcript?: Array<Omit<TranscriptSegment, "id" | "mediaAssetId"> & { id?: string }>;
  error?: string;
};

/**
 * Persist local-agent analysis results for one or more media assets.
 * Heavy work runs on the Desktop Agent; this route stores metadata only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const body = (await request.json()) as { results: IncomingBundle[] };
    if (!Array.isArray(body.results) || !body.results.length) {
      return NextResponse.json({ error: "results are required" }, { status: 400 });
    }

    const job = await createJob(access.appUser, projectId, "analyze", {
      count: body.results.length,
    });
    await updateJob(job.id, {
      status: "running",
      progress: 10,
      startedAt: new Date().toISOString(),
      message: `Saving analysis for ${body.results.length} clip(s)`,
    });

    const media = await listMediaAssets(projectId);
    const byId = new Map(media.map((m) => [m.id, m]));
    const saved: ClipAnalysisBundle[] = [];

    for (const r of body.results.slice(0, 100)) {
      if (!r.mediaAssetId || !byId.has(r.mediaAssetId)) continue;
      const now = new Date().toISOString();
      const bundle: ClipAnalysisBundle = {
        mediaAssetId: r.mediaAssetId,
        technical: r.technical
          ? { ...r.technical, mediaAssetId: r.mediaAssetId, analyzedAt: r.technical.analyzedAt || now }
          : undefined,
        shots: (r.shots ?? []).map((s, i) => ({
          id: s.id || `${r.mediaAssetId}_shot_${i}`,
          mediaAssetId: r.mediaAssetId,
          index: s.index ?? i,
          startSeconds: s.startSeconds,
          endSeconds: s.endSeconds,
          confidence: s.confidence ?? 0.5,
          shotSize: s.shotSize,
          movement: s.movement,
        })),
        transcript: (r.transcript ?? []).map((t, i) => ({
          id: t.id || `${r.mediaAssetId}_tr_${i}`,
          mediaAssetId: r.mediaAssetId,
          startSeconds: t.startSeconds,
          endSeconds: t.endSeconds,
          text: t.text,
          speaker: t.speaker,
          confidence: t.confidence ?? 0.5,
        })),
        analysisStatus: r.error ? "failed" : "complete",
        error: r.error,
        updatedAt: now,
      };
      await upsertAnalysisBundle(projectId, bundle);
      const asset = byId.get(r.mediaAssetId)!;
      await upsertMediaAssets([
        {
          ...asset,
          analysisStatus: bundle.analysisStatus,
          updatedAt: now,
        },
      ]);
      saved.push(bundle);
    }

    const completedJob = await updateJob(job.id, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
      message: `Saved analysis for ${saved.length} clip(s)`,
    });

    return NextResponse.json({ ok: true, analysis: saved, job: completedJob });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
