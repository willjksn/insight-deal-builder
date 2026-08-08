import { NextRequest, NextResponse } from "next/server";
import { buildResolveSyncRecord } from "@/lib/aiEditor/resolveSync";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  createJob,
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
 * V5 — persist a read-only Resolve timeline snapshot (from Desktop Agent).
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

    const created = await createJob(access.appUser, projectId, "resolve_sync", {
      timelineName: sync.timelineName,
      videoClipCount: sync.videoClipCount,
      durationFrames: sync.durationFrames,
    });

    const settings = await upsertAiEditorProjectSettings(projectId, {
      lastResolveSync: sync,
    });

    const job = await updateJob(created.id, {
      status: "completed",
      progress: 100,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      message: sync.timelineName
        ? `Synced “${sync.timelineName}” from Resolve`
        : "Synced timeline from Resolve",
    });

    return NextResponse.json({ ok: true, sync, settings, job });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
