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
export const maxDuration = 300;

const PRODUCTION_BOARDS_COLLECTION = "productionBoards";
const MAX_BATCH = 12;

type Body = {
  /** Limit to one day; omit for all days. */
  dayId?: string;
  /** Only shots without a frame (default true). */
  onlyMissing?: boolean;
  /** Cap how many to generate this request (max 12). */
  limit?: number;
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

    const body = (await request.json().catch(() => ({}))) as Body;
    const onlyMissing = body.onlyMissing !== false;
    const limit = Math.min(
      MAX_BATCH,
      Math.max(1, Number.isFinite(body.limit) ? Number(body.limit) : MAX_BATCH)
    );
    const filterDayId = body.dayId?.trim();

    const boardSnap = await db
      .collection(PRODUCTION_BOARDS_COLLECTION)
      .where("projectId", "==", projectId)
      .limit(1)
      .get();
    if (boardSnap.empty) {
      return NextResponse.json({ error: "Production board not found" }, { status: 404 });
    }

    const boardDoc = boardSnap.docs[0];
    let board = { id: boardDoc.id, ...boardDoc.data() } as ProductionBoard;

    type Target = { dayId: string; shotId: string };
    const targets: Target[] = [];
    for (const day of board.productionDays) {
      if (filterDayId && day.id !== filterDayId) continue;
      for (const shot of day.shots ?? []) {
        if (onlyMissing && shot.referenceImageUrl?.trim()) continue;
        targets.push({ dayId: day.id, shotId: shot.id });
        if (targets.length >= limit) break;
      }
      if (targets.length >= limit) break;
    }

    if (targets.length === 0) {
      return NextResponse.json({
        generated: [],
        remaining: 0,
        message: onlyMissing ? "All visible shots already have frames." : "No shots to generate.",
      });
    }

    const generated: Array<{
      dayId: string;
      shotId: string;
      referenceImageUrl: string;
      referenceImageStoragePath: string;
      referenceImageSource: "ai_generate";
    }> = [];
    const errors: Array<{ dayId: string; shotId: string; error: string }> = [];

    for (const target of targets) {
      const day = board.productionDays.find((d) => d.id === target.dayId);
      const shot = day?.shots?.find((s) => s.id === target.shotId);
      if (!day || !shot) continue;

      try {
        const frame = await generateCoverageFrameForShot({
          projectId,
          shot,
          inspirationImages: board.inspirationImages ?? [],
        });
        const patch: Partial<ProductionDayShot> = {
          referenceImageUrl: frame.referenceImageUrl,
          referenceImageStoragePath: frame.referenceImageStoragePath,
          referenceImageSource: frame.referenceImageSource,
        };
        board = {
          ...board,
          productionDays: board.productionDays.map((d) =>
            d.id !== target.dayId
              ? d
              : {
                  ...d,
                  shots: d.shots.map((s) => (s.id === target.shotId ? { ...s, ...patch } : s)),
                }
          ),
        };
        generated.push({ dayId: target.dayId, shotId: target.shotId, ...frame });
      } catch (e) {
        errors.push({
          dayId: target.dayId,
          shotId: target.shotId,
          error: e instanceof Error ? e.message : "Generate failed",
        });
      }
    }

    if (generated.length > 0) {
      await boardDoc.ref.update({
        productionDays: board.productionDays,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    let remaining = 0;
    if (onlyMissing) {
      for (const day of board.productionDays) {
        if (filterDayId && day.id !== filterDayId) continue;
        for (const shot of day.shots ?? []) {
          if (!shot.referenceImageUrl?.trim()) remaining += 1;
        }
      }
    }

    return NextResponse.json({ generated, errors, remaining });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate frames";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
