import { NextRequest, NextResponse } from "next/server";
import { buildCoverageReport } from "@/lib/aiEditor/matching";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import { loadProductionContext } from "@/lib/aiEditor/productionContextServer";
import {
  createJob,
  getCoverageReport,
  listAnalysisBundles,
  listMediaAssets,
  updateJob,
  upsertCoverageReport,
} from "@/lib/aiEditor/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import type { ProductionBoard } from "@/lib/production/types";
import type { ScriptDocument, ScriptWriterSession } from "@/lib/scriptWriter/types";
import type { MatchDialogueLine, PreferredTakeOverride } from "@/lib/aiEditor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCTION_BOARDS_COLLECTION = "productionBoards";

async function loadDialogueByScene(projectId: string): Promise<Record<string, MatchDialogueLine[]>> {
  const db = getAdminDb();
  if (!db) return {};

  const boardSnap = await db
    .collection(PRODUCTION_BOARDS_COLLECTION)
    .where("projectId", "==", projectId)
    .limit(1)
    .get();
  const board = boardSnap.empty
    ? null
    : serializeDoc<ProductionBoard>(boardSnap.docs[0].id, boardSnap.docs[0].data());

  let scriptSession: ScriptWriterSession | null = null;
  const sessionId = board?.scriptSessionId;
  if (sessionId) {
    const s = await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(sessionId).get();
    if (s.exists) scriptSession = serializeDoc<ScriptWriterSession>(s.id, s.data()!);
  }
  if (!scriptSession) {
    const linked = await db
      .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
      .where("linkedProjectId", "==", projectId)
      .limit(1)
      .get();
    if (!linked.empty) {
      scriptSession = serializeDoc<ScriptWriterSession>(
        linked.docs[0].id,
        linked.docs[0].data()
      );
    }
  }

  const script = (scriptSession?.script as ScriptDocument | null) ?? null;
  const out: Record<string, MatchDialogueLine[]> = {};
  for (const scene of script?.scenes ?? []) {
    const lines = (scene.dialogue ?? [])
      .filter((d) => d.line?.trim())
      .map((d) => ({ character: d.character || "", line: d.line.trim() }));
    if (!lines.length) continue;
    const keys = new Set<string>();
    if (scene.sceneNumber) keys.add(String(scene.sceneNumber).toLowerCase());
    if (scene.heading) keys.add(scene.heading.toLowerCase());
    for (const k of keys) out[k] = lines;
  }
  return out;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;
    const coverage = await getCoverageReport(projectId);
    return NextResponse.json({ coverage });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}

/**
 * Run deterministic coverage matching (V1D). Optional preferred-take overrides.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const body = (await request.json().catch(() => ({}))) as {
      overrides?: PreferredTakeOverride[];
    };

    const existing = await getCoverageReport(projectId);
    const overrides = Array.isArray(body.overrides)
      ? body.overrides
      : existing?.overrides ?? [];

    const job = await createJob(access.appUser, projectId, "match", {
      overrideCount: overrides.length,
    });
    await updateJob(job.id, {
      status: "running",
      progress: 20,
      startedAt: new Date().toISOString(),
      message: "Matching clips to coverage shots",
    });

    const [context, media, analysis, dialogueByScene] = await Promise.all([
      loadProductionContext(projectId),
      listMediaAssets(projectId),
      listAnalysisBundles(projectId),
      loadDialogueByScene(projectId),
    ]);

    const coverage = buildCoverageReport({
      projectId,
      context,
      media,
      analysis,
      dialogueByScene,
      overrides,
    });
    await upsertCoverageReport(coverage);

    const completedJob = await updateJob(job.id, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
      message: `Matched ${coverage.coveredCount}/${coverage.plannedShotCount} planned shots`,
    });

    return NextResponse.json({ ok: true, coverage, job: completedJob });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
