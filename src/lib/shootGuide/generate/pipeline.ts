import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { SHOOT_GUIDES_COLLECTION } from "@/lib/shootGuide/collections";
import { buildExecutionPatch } from "@/lib/shootGuide/generate/execution";
import { loadScriptExcerpt } from "@/lib/shootGuide/generate/context";
import { loadShootGuideCatalog, shootGuideGearPrompt } from "@/lib/shootGuide/generate/gear";
import { generateSceneAnalysis } from "@/lib/shootGuide/generate/scene";
import { generateShotSequence, generateOneShot } from "@/lib/shootGuide/generate/shots";
import { generateVisualStrategy } from "@/lib/shootGuide/generate/strategy";
import { buildVisionPatch, generateVisualIntelligence } from "@/lib/shootGuide/generate/vision";
import { mergeGeneratedShots, mergeVisualAnalysis, replaceGeneratedShot } from "@/lib/shootGuide/parse";
import type {
  ShootGuide,
  ShootGuideGenerateRequest,
  ShootGuideGenerateStage,
  ShootGuidePatch,
} from "@/lib/shootGuide/types";

async function loadGuide(guideId: string, userId: string): Promise<ShootGuide> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const snap = await db.collection(SHOOT_GUIDES_COLLECTION).doc(guideId).get();
  if (!snap.exists) throw new Error("Shoot guide not found");
  const data = snap.data() || {};
  if (data.userId !== userId) throw new Error("Forbidden");
  return { id: snap.id, ...data } as ShootGuide;
}

async function patchGuide(guideId: string, patch: ShootGuidePatch & Record<string, unknown>): Promise<ShootGuide> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  await db
    .collection(SHOOT_GUIDES_COLLECTION)
    .doc(guideId)
    .set(
      stripUndefined({
        ...patch,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true }
    );
  const snap = await db.collection(SHOOT_GUIDES_COLLECTION).doc(guideId).get();
  return { id: snap.id, ...snap.data() } as ShootGuide;
}

export async function runShootGuideGeneration(params: {
  guideId: string;
  userId: string;
  request?: ShootGuideGenerateRequest;
}): Promise<ShootGuide> {
  const stage: ShootGuideGenerateStage = params.request?.stage || "all";
  let guide = await loadGuide(params.guideId, params.userId);
  const [scriptExcerpt, gearPromptBlock] = await Promise.all([
    loadScriptExcerpt(guide),
    shootGuideGearPrompt(guide),
  ]);
  const extras = { scriptExcerpt, gearPromptBlock };

  async function applyExecution(current: ShootGuide): Promise<ShootGuide> {
    const catalog = await loadShootGuideCatalog();
    const patch = buildExecutionPatch(current, catalog);
    return patchGuide(params.guideId, patch as ShootGuidePatch & Record<string, unknown>);
  }

  async function applyVision(current: ShootGuide): Promise<ShootGuide> {
    const parsed = await generateVisualIntelligence(current, extras);
    return patchGuide(
      params.guideId,
      buildVisionPatch(current, parsed) as ShootGuidePatch & Record<string, unknown>
    );
  }

  if (stage === "execution") {
    return applyExecution(guide);
  }

  if (stage === "vision") {
    return applyVision(guide);
  }

  if (stage === "shot") {
    const shotId = params.request?.shotId;
    if (!shotId) throw new Error("shotId is required");
    const current = (guide.shots ?? []).find((s) => s.id === shotId);
    if (!current) throw new Error("Shot not found");
    const nextShot = await generateOneShot(guide, current, {
      ...extras,
      instruction: params.request?.instruction,
    });
    const shots = replaceGeneratedShot(guide.shots ?? [], shotId, nextShot);
    const saved = await patchGuide(params.guideId, {
      shots,
      currentShotId: shotId,
      status: guide.status === "draft" ? "ready" : guide.status,
    });
    return applyExecution(saved);
  }

  if (stage === "all" || stage === "scene") {
    const sceneAnalysis = await generateSceneAnalysis(guide, extras);
    guide = await patchGuide(params.guideId, { sceneAnalysis });
    if (stage === "scene") return guide;
  }

  if (stage === "all") {
    guide = await applyVision(guide);
  }

  if (stage === "all" || stage === "strategy") {
    if (!guide.sceneAnalysis) {
      const sceneAnalysis = await generateSceneAnalysis(guide, extras);
      guide = await patchGuide(params.guideId, { sceneAnalysis });
    }
    const strategy = await generateVisualStrategy(guide, extras);
    guide = await patchGuide(params.guideId, {
      overview: strategy.overview,
      setup: strategy.setup,
      visualAnalysis: mergeVisualAnalysis(guide.visualAnalysis, strategy.visualAnalysis),
      lightingPlan: strategy.lightingPlan,
    });
    if (stage === "strategy") return guide;
  }

  if (stage === "all" || stage === "shots") {
    if (!guide.sceneAnalysis) {
      const sceneAnalysis = await generateSceneAnalysis(guide, extras);
      guide = await patchGuide(params.guideId, { sceneAnalysis });
    }
    const generated = await generateShotSequence(guide, extras);
    if (!generated.length) throw new Error("Shot generation returned no shots");
    const shots = mergeGeneratedShots(guide.shots ?? [], generated);
    const saved = await patchGuide(params.guideId, {
      shots,
      currentShotId: shots[0]?.id ?? guide.currentShotId,
      status: guide.status === "draft" || guide.status === "ready" ? "ready" : guide.status,
      overview: {
        ...(guide.overview || {}),
        recommendedShotCount: shots.length,
      },
    });
    return applyExecution(saved);
  }

  return guide;
}
