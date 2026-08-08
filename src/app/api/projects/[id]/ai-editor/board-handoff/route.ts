import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  countOpenChecklistItems,
  formatNextShootHandoffBlock,
  mergeFilmingNotesWithHandoff,
} from "@/lib/aiEditor/boardHandoff";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  createJob,
  getAiEditorProjectSettings,
  updateJob,
  upsertAiEditorProjectSettings,
} from "@/lib/aiEditor/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { PRODUCTION_BOARDS_COLLECTION } from "@/lib/firebase/productionRepos";
import { stripUndefined } from "@/lib/firebase/firestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type { ProductionBoard } from "@/lib/production/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  /** Include checked-off items too (default: open only). */
  includeDone?: boolean;
};

/**
 * V9 — append/replace next-shoot checklist into production board filming notes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const body = (await request.json().catch(() => ({}))) as Body;
    const settings = await getAiEditorProjectSettings(projectId);
    const checklist = settings?.nextShootChecklist;
    if (!checklist?.items?.length) {
      return NextResponse.json(
        {
          error:
            "No next-shoot checklist yet — sync from Resolve first to build one.",
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const boardSnap = await db
      .collection(PRODUCTION_BOARDS_COLLECTION)
      .where("projectId", "==", projectId)
      .limit(1)
      .get();

    if (boardSnap.empty) {
      return NextResponse.json(
        {
          error:
            "No production board for this project yet. Open Production to create one, then send again.",
        },
        { status: 404 }
      );
    }

    const boardDoc = boardSnap.docs[0]!;
    const board = serializeDoc<ProductionBoard>(boardDoc.id, boardDoc.data());
    const handoffBlock = formatNextShootHandoffBlock(checklist, {
      includeDone: body.includeDone === true,
    });
    const filmingNotes = mergeFilmingNotesWithHandoff(board.filmingNotes, handoffBlock);
    const openCount = countOpenChecklistItems(checklist);

    const created = await createJob(access.appUser, projectId, "board_handoff", {
      openCount,
      boardId: board.id,
    });

    await boardDoc.ref.update(
      stripUndefined({
        filmingNotes,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const nextSettings = await upsertAiEditorProjectSettings(projectId, {
      lastBoardHandoffAt: new Date().toISOString(),
    });

    const job = await updateJob(created.id, {
      status: "completed",
      progress: 100,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      message: `Sent ${openCount} next-shoot item(s) to production board notes`,
    });

    return NextResponse.json({
      ok: true,
      boardId: board.id,
      openCount,
      filmingNotes,
      settings: nextSettings,
      job,
    });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
