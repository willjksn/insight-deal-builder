import { NextRequest, NextResponse } from "next/server";
import { normalizeEditNotes } from "@/lib/aiEditor/editNotes";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  createJob,
  updateJob,
  upsertAiEditorProjectSettings,
} from "@/lib/aiEditor/server";
import type { EditNote } from "@/lib/aiEditor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  notes: EditNote[];
};

/**
 * Save project edit notes (shoot / client / look) for Edit by Chat.
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
    if (!Array.isArray(body.notes)) {
      return NextResponse.json({ error: "notes array required" }, { status: 400 });
    }

    const notes = normalizeEditNotes(body.notes);

    const created = await createJob(access.appUser, projectId, "edit_notes", {
      count: notes.length,
    });

    const settings = await upsertAiEditorProjectSettings(projectId, {
      editNotes: notes,
    });

    const job = await updateJob(created.id, {
      status: "completed",
      progress: 100,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      message:
        notes.length === 0
          ? "Cleared edit notes"
          : `Saved ${notes.length} edit note${notes.length === 1 ? "" : "s"}`,
    });

    return NextResponse.json({ ok: true, notes, settings, job });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
