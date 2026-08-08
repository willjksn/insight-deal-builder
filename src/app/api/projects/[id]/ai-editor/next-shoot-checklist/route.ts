import { NextRequest, NextResponse } from "next/server";
import {
  buildNextShootChecklist,
  toggleChecklistItem,
} from "@/lib/aiEditor/nextShootChecklist";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  createJob,
  getAiEditorProjectSettings,
  getCoverageReport,
  updateJob,
  upsertAiEditorProjectSettings,
} from "@/lib/aiEditor/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  /** Toggle a single item */
  itemId?: string;
  done?: boolean;
  /** Rebuild from latest planning feedback + coverage */
  rebuild?: boolean;
};

/**
 * V8 — update or rebuild the next-shoot checklist.
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
    let checklist = settings?.nextShootChecklist;

    if (body.rebuild) {
      const coverage = await getCoverageReport(projectId);
      checklist = buildNextShootChecklist({
        feedback: settings?.lastPlanningFeedback,
        coverage,
        previous: checklist,
      });
    } else if (body.itemId && checklist) {
      checklist = toggleChecklistItem(checklist, body.itemId, body.done);
    } else if (body.itemId && !checklist) {
      return NextResponse.json(
        { error: "No checklist yet — sync from Resolve first" },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: "Pass itemId to toggle, or rebuild: true" },
        { status: 400 }
      );
    }

    const created = await createJob(access.appUser, projectId, "next_shoot_checklist", {
      itemId: body.itemId,
      rebuild: Boolean(body.rebuild),
      remaining: checklist.items.filter((i) => !i.done).length,
    });

    const nextSettings = await upsertAiEditorProjectSettings(projectId, {
      nextShootChecklist: checklist,
    });

    const job = await updateJob(created.id, {
      status: "completed",
      progress: 100,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      message: body.rebuild
        ? `Rebuilt next-shoot checklist (${checklist.items.length})`
        : "Updated next-shoot checklist",
    });

    return NextResponse.json({
      ok: true,
      checklist,
      settings: nextSettings,
      job,
    });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
