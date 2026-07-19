import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateCoverageFrameForShot } from "@/lib/production/generateCoverageFrame";
import type { ProductionBoard, ProductionDayShot } from "@/lib/production/types";
import { hasProjectAreaAccess } from "@/lib/projectAccess/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const PRODUCTION_BOARDS_COLLECTION = "productionBoards";

type Body = {
  dayId?: string;
  shotId?: string;
  /** When true, overwrite an existing frame. Default: skip if already framed. */
  force?: boolean;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id: projectId } = await params;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const canEdit = await hasProjectAreaAccess(db, projectId, uid, appUser, "production");
    const canShots = await hasProjectAreaAccess(db, projectId, uid, appUser, "shots");
    if (!canEdit && !canShots) {
      return NextResponse.json({ error: "Not authorized for coverage on this project" }, { status: 403 });
    }

    const body = (await request.json()) as Body;
    const dayId = body.dayId?.trim();
    const shotId = body.shotId?.trim();
    if (!dayId || !shotId) {
      return NextResponse.json({ error: "dayId and shotId are required" }, { status: 400 });
    }

    const boardSnap = await db
      .collection(PRODUCTION_BOARDS_COLLECTION)
      .where("projectId", "==", projectId)
      .limit(1)
      .get();
    if (boardSnap.empty) {
      return NextResponse.json({ error: "Production board not found" }, { status: 404 });
    }

    const boardDoc = boardSnap.docs[0];
    const board = { id: boardDoc.id, ...boardDoc.data() } as ProductionBoard;
    const dayIndex = board.productionDays.findIndex((d) => d.id === dayId);
    if (dayIndex < 0) {
      return NextResponse.json({ error: "Shoot day not found" }, { status: 404 });
    }
    const day = board.productionDays[dayIndex];
    const shotIndex = (day.shots ?? []).findIndex((s) => s.id === shotId);
    if (shotIndex < 0) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    const shot = day.shots[shotIndex];
    if (shot.referenceImageUrl?.trim() && !body.force) {
      return NextResponse.json(
        {
          error: "Shot already has a frame. Pass force: true to regenerate.",
          skipped: true,
          referenceImageUrl: shot.referenceImageUrl,
        },
        { status: 409 }
      );
    }

    const generated = await generateCoverageFrameForShot({
      projectId,
      shot,
      inspirationImages: board.inspirationImages ?? [],
    });

    const patch: Partial<ProductionDayShot> = {
      referenceImageUrl: generated.referenceImageUrl,
      referenceImageStoragePath: generated.referenceImageStoragePath,
      referenceImageSource: generated.referenceImageSource,
    };

    const nextDays = board.productionDays.map((d, di) => {
      if (di !== dayIndex) return d;
      return {
        ...d,
        shots: d.shots.map((s, si) => (si === shotIndex ? { ...s, ...patch } : s)),
      };
    });

    await boardDoc.ref.update({
      productionDays: nextDays,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      dayId,
      shotId,
      ...patch,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate frame";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
