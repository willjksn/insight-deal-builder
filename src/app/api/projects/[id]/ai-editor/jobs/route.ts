import { NextRequest, NextResponse } from "next/server";
import { buildManagedFolderPlan } from "@/lib/aiEditor/projectFolders";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  createJob,
  getAiEditorProjectSettings,
  listJobs,
  updateJob,
  upsertAiEditorProjectSettings,
} from "@/lib/aiEditor/server";
import type { AiEditorJobType, ManagedIngestSummary } from "@/lib/aiEditor/types";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;
    const jobs = await listJobs(projectId);
    return NextResponse.json({ jobs });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const body = (await request.json()) as {
      type: AiEditorJobType;
      cameraLabels?: string[];
      message?: string;
      launched?: boolean;
      handoffDir?: string;
      ingestSummary?: ManagedIngestSummary;
    };

    if (body.type === "ingest_copy") {
      const summary = body.ingestSummary;
      if (!summary?.at || !summary.cameraLabel) {
        return NextResponse.json(
          { error: "ingestSummary with at + cameraLabel is required" },
          { status: 400 }
        );
      }
      const cam = summary.cameraLabel.replace(/_/g, " ").trim() || "camera";
      const created = await createJob(access.appUser, projectId, "ingest_copy", {
        ingestSummary: summary,
      });
      const status = summary.copiedOk <= 0 && !summary.stopped ? "failed" : "completed";
      const message =
        body.message ||
        (summary.stopped
          ? `Managed ingest stopped — ${summary.copiedOk} ${cam} clip(s) saved` +
            (summary.failed ? ` (${summary.failed} failed)` : "")
          : `Managed ingest — ${summary.copiedOk} ${cam} clip(s) verified` +
            (summary.failed ? ` (${summary.failed} failed)` : ""));
      const job = await updateJob(created.id, {
        status,
        progress: 100,
        startedAt: summary.at,
        completedAt: new Date().toISOString(),
        message,
      });
      const settings = await upsertAiEditorProjectSettings(projectId, {
        lastManagedIngest: summary,
      });
      return NextResponse.json({ ok: true, job, settings });
    }

    if (body.type === "resolve_open" || body.type === "resolve_import") {
      const created = await createJob(access.appUser, projectId, body.type, {
        launched: body.launched,
        handoffDir: body.handoffDir,
      });
      const job = await updateJob(created.id, {
        status: "completed",
        progress: 100,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        message:
          body.message ||
          (body.type === "resolve_import" ? "Resolve import" : "Resolve open / handoff write"),
      });
      return NextResponse.json({ ok: true, job });
    }

    if (body.type === "create_folders") {
      const settings = await getAiEditorProjectSettings(projectId);
      if (!settings?.projectRootPath) {
        return NextResponse.json(
          { error: "Configure active storage / project root first" },
          { status: 400 }
        );
      }
      const cameraLabels = body.cameraLabels?.length
        ? body.cameraLabels
        : settings.cameraLabels ?? ["CAMERA_A"];
      const folderPlan = buildManagedFolderPlan(cameraLabels);
      const job = await createJob(access.appUser, projectId, "create_folders", {
        projectRootPath: settings.projectRootPath,
        folderPlan,
      });
      await upsertAiEditorProjectSettings(projectId, { cameraLabels });
      // Agent performs mkdir; cloud job records the plan for UI + audit.
      const queuedJob = await updateJob(job.id, {
        status: "queued",
        progress: 0,
        message: "Folder plan ready — run via Desktop Agent",
      });
      return NextResponse.json({
        job: queuedJob,
        folderPlan,
        projectRootPath: settings.projectRootPath,
      });
    }

    return NextResponse.json({ error: "Unsupported job type" }, { status: 400 });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
