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
import type { AiEditorJobType } from "@/lib/aiEditor/types";

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
    };

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
