import { NextRequest, NextResponse } from "next/server";
import {
  planArchiveBatch,
  planRestoreBatch,
  summarizeArchiveState,
} from "@/lib/aiEditor/archive";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  createJob,
  getAiEditorProjectSettings,
  listMediaAssets,
  updateJob,
  upsertAiEditorProjectSettings,
} from "@/lib/aiEditor/server";
import type { AiEditorJobType } from "@/lib/aiEditor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  action: "plan" | "set_root" | "log";
  archiveRootPath?: string;
  /** For log: which operation completed on the workstation */
  type?: "archive" | "restore" | "reclaim";
  message?: string;
  count?: number;
  mediaIds?: string[];
};

/**
 * V1H — archive / restore / reclaim metadata + job logging.
 * File IO runs on the Desktop Agent; this route plans and records results.
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
    const settings = await getAiEditorProjectSettings(projectId);
    const media = await listMediaAssets(projectId);

    if (body.action === "set_root") {
      const archiveRootPath = body.archiveRootPath?.trim();
      if (!archiveRootPath) {
        return NextResponse.json({ error: "archiveRootPath is required" }, { status: 400 });
      }
      const next = await upsertAiEditorProjectSettings(projectId, { archiveRootPath });
      return NextResponse.json({ ok: true, settings: next });
    }

    if (body.action === "plan") {
      const archiveRoot = body.archiveRootPath?.trim() || settings?.archiveRootPath || "";
      const projectRoot = settings?.projectRootPath || "";
      const projectSlug =
        settings?.projectRootRelativeName ||
        projectRoot.replace(/[\\\/]+$/, "").split(/[\\\/]/).pop() ||
        projectId;

      const archivePlan = archiveRoot
        ? planArchiveBatch({
            media,
            projectRoot,
            archiveRoot,
            projectSlug,
          })
        : { items: [], skipped: media.map((m) => ({ mediaAssetId: m.id, filename: m.filename, reason: "No archive root" })) };

      const restorePlan = projectRoot
        ? planRestoreBatch({ media, projectRoot })
        : { items: [], skipped: [] };

      return NextResponse.json({
        ok: true,
        summary: summarizeArchiveState(media, projectRoot),
        archiveRootPath: archiveRoot || null,
        projectRootPath: projectRoot || null,
        archive: archivePlan,
        restore: restorePlan,
      });
    }

    if (body.action === "log") {
      const type = (body.type || "archive") as AiEditorJobType;
      if (type !== "archive" && type !== "restore" && type !== "reclaim") {
        return NextResponse.json({ error: "type must be archive, restore, or reclaim" }, { status: 400 });
      }
      const created = await createJob(access.appUser, projectId, type, {
        mediaIds: body.mediaIds ?? [],
        count: body.count ?? 0,
      });
      const job = await updateJob(created.id, {
        status: "completed",
        progress: 100,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        message: body.message || `${type} completed`,
      });
      return NextResponse.json({ ok: true, job });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
