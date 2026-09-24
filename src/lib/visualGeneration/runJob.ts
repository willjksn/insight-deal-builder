import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { SHOOT_GUIDES_COLLECTION } from "@/lib/shootGuide/collections";
import type { ShootGuide, ShootGuideShot, ShotVisualAsset } from "@/lib/shootGuide/types";
import { resolveVisualStatus, statusAfterAsset } from "@/lib/shootGuide/visualAssets";
import { motionModel, stillModel } from "./cost";
import { storeGeneratedMedia } from "./persist";
import {
  buildMotionPrompt,
  buildStillPrompt,
  latestReadyStill,
  motionDurationSeconds,
  selectReferenceImages,
} from "./prompts";
import { getVisualProvider } from "./runway";
import type { VisualQuality, VisualTask } from "./types";

type GuideRecord = ShootGuide & { userId: string };

function asGuide(id: string, data: Record<string, unknown>): GuideRecord {
  return { id, ...data } as GuideRecord;
}

async function loadOwnedGuide(uid: string, guideId: string): Promise<GuideRecord> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const snap = await db.collection(SHOOT_GUIDES_COLLECTION).doc(guideId).get();
  if (!snap.exists) throw new Error("Not found");
  const guide = asGuide(snap.id, snap.data() || {});
  if (guide.userId !== uid) throw new Error("Forbidden");
  return guide;
}

async function saveShots(guideId: string, shots: ShootGuideShot[]): Promise<GuideRecord> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const ref = db.collection(SHOOT_GUIDES_COLLECTION).doc(guideId);
  await ref.set(stripUndefined({ shots, updatedAt: FieldValue.serverTimestamp() }), { merge: true });
  const next = await ref.get();
  return asGuide(next.id, next.data() || {});
}

export function applyTaskToAsset(asset: ShotVisualAsset, task: VisualTask): ShotVisualAsset {
  return {
    ...asset,
    provider: "runway",
    providerTaskId: task.taskId || asset.providerTaskId,
    model: task.model || asset.model,
    estimatedCredits: task.estimatedCredits ?? asset.estimatedCredits ?? null,
    actualCredits: task.actualCredits ?? asset.actualCredits ?? null,
    status: task.status === "ready" && !task.outputUrl ? "failed" : task.status,
    error: task.status === "failed" ? task.error || "Generation failed" : task.status === "ready" && !task.outputUrl ? "Runway returned no file" : null,
    prompt: asset.prompt,
  };
}

export async function startShotVisual(params: {
  uid: string;
  guideId: string;
  shotId: string;
  type: "ai_still" | "ai_motion";
  quality: VisualQuality;
  regenerate?: boolean;
}): Promise<{ guide: GuideRecord; asset: ShotVisualAsset }> {
  const guide = await loadOwnedGuide(params.uid, params.guideId);
  const shot = (guide.shots ?? []).find((item) => item.id === params.shotId);
  if (!shot) throw new Error("Shot not found");

  const existing = [...(shot.visualAssets ?? [])]
    .reverse()
    .find((asset) => asset.type === params.type && asset.status === "pending" && !params.regenerate);
  if (existing?.providerTaskId) return { guide, asset: existing };

  const references = selectReferenceImages(guide);
  const still = latestReadyStill(shot);
  if (params.type === "ai_motion" && !still?.storageUrl) {
    throw new Error("Add a storyboard or AI still before animating this shot");
  }

  const prompt =
    params.type === "ai_still"
      ? buildStillPrompt(guide, shot, references)
      : buildMotionPrompt(guide, shot);
  const durationSeconds = motionDurationSeconds(shot);
  const estimate =
    params.type === "ai_still" ? stillModel(references.length) : motionModel(params.quality, durationSeconds);

  const asset: ShotVisualAsset = existing ?? {
    id: crypto.randomUUID(),
    sceneId: guide.id,
    shotId: shot.id,
    type: params.type,
    provider: null,
    createdAt: new Date().toISOString(),
    storageUrl: null,
    storagePath: null,
    prompt,
    status: "pending",
  };

  const provider = getVisualProvider();
  let task: VisualTask;
  try {
    task =
      params.type === "ai_still"
        ? await provider.generateStill({ prompt, referenceImages: references })
        : await provider.generateMotion({
            prompt,
            startFrameUrl: still!.storageUrl!,
            durationSeconds,
            quality: params.quality,
          });
  } catch (err) {
    const failed: ShotVisualAsset = {
      ...asset,
      prompt,
      provider: "runway",
      model: estimate.model,
      quality: params.quality,
      estimatedCredits: estimate.credits,
      durationSeconds: params.type === "ai_motion" ? durationSeconds : null,
      status: "failed",
      error: err instanceof Error ? err.message : "Generation failed",
    };
    const shots = replaceAsset(guide.shots ?? [], shot.id, failed, Boolean(existing));
    const saved = await saveShots(guide.id, shots);
    return { guide: saved, asset: failed };
  }

  const pending = applyTaskToAsset(
    {
      ...asset,
      prompt,
      quality: params.quality,
      durationSeconds: params.type === "ai_motion" ? durationSeconds : null,
      model: task.model,
    },
    { ...task, status: "pending" }
  );
  const shots = replaceAsset(guide.shots ?? [], shot.id, pending, Boolean(existing));
  const saved = await saveShots(guide.id, shots);
  return { guide: saved, asset: pending };
}

export async function refreshShotVisual(params: {
  uid: string;
  guideId: string;
  shotId: string;
  assetId: string;
}): Promise<{ guide: GuideRecord; asset: ShotVisualAsset }> {
  const guide = await loadOwnedGuide(params.uid, params.guideId);
  const shot = (guide.shots ?? []).find((item) => item.id === params.shotId);
  const asset = shot?.visualAssets?.find((item) => item.id === params.assetId);
  if (!shot || !asset) throw new Error("Visual asset not found");
  if (asset.status !== "pending" || !asset.providerTaskId) return { guide, asset };

  const task = await getVisualProvider().getTaskStatus(asset.providerTaskId);
  let next = applyTaskToAsset(asset, { ...task, model: asset.model || task.model });
  if (task.status === "ready" && task.outputUrl) {
    try {
      const stored = await storeGeneratedMedia({
        userId: params.uid,
        guideId: guide.id,
        shotId: shot.id,
        assetType: asset.type,
        assetId: asset.id,
        sourceUrl: task.outputUrl,
      });
      next = {
        ...next,
        status: "ready",
        storageUrl: stored.storageUrl,
        storagePath: stored.storagePath,
        mimeType: stored.mimeType,
        error: null,
      };
    } catch (err) {
      next = {
        ...next,
        status: "failed",
        error: err instanceof Error ? err.message : "Could not store the generated file",
      };
    }
  }

  const visualStatus = statusAfterAsset(resolveVisualStatus(shot), next);
  const shots = (guide.shots ?? []).map((item) =>
    item.id === shot.id
      ? {
          ...item,
          visualStatus,
          visualAssets: (item.visualAssets ?? []).map((row) => (row.id === next.id ? next : row)),
        }
      : item
  );
  const saved = await saveShots(guide.id, shots);
  return { guide: saved, asset: next };
}

function replaceAsset(
  shots: ShootGuideShot[],
  shotId: string,
  asset: ShotVisualAsset,
  reuse: boolean
): ShootGuideShot[] {
  return shots.map((shot) => {
    if (shot.id !== shotId) return shot;
    const current = shot.visualAssets ?? [];
    const visualAssets = reuse
      ? current.map((row) => (row.id === asset.id ? asset : row))
      : [...current, asset];
    return { ...shot, visualAssets };
  });
}
