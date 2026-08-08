import { randomUUID } from "crypto";
import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import type { ClipAnalysisBundle } from "@/lib/aiEditor/analysis";
import {
  AI_EDITOR_AGENT_SESSIONS_COLLECTION,
  AI_EDITOR_ANALYSIS_COLLECTION,
  AI_EDITOR_JOBS_COLLECTION,
  AI_EDITOR_MATCHING_COLLECTION,
  AI_EDITOR_MEDIA_COLLECTION,
  AI_EDITOR_PROJECT_SETTINGS_COLLECTION,
  AI_EDITOR_STORAGE_COLLECTION,
  AI_EDITOR_TIMELINES_COLLECTION,
  AI_EDITOR_TIMELINE_VERSIONS_COLLECTION,
} from "@/lib/aiEditor/collections";
import {
  MAX_JOBS_LISTED,
  MAX_MEDIA_ASSETS,
  MAX_TIMELINE_VERSIONS,
} from "@/lib/aiEditor/limits";
import { assertSafeStoragePath } from "@/lib/aiEditor/pathValidation";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type {
  AiEditorJob,
  AiEditorJobStatus,
  AiEditorJobType,
  AiEditorProjectSettings,
  CoverageReport,
  MediaAsset,
  StorageLocation,
  StoragePurpose,
  StorageType,
  Timeline,
  TimelineVersion,
} from "@/lib/aiEditor/types";
import type { AppUser } from "@/lib/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

function tenantCompany(appUser: AppUser): string | undefined {
  return appUser.company?.trim() || undefined;
}

export async function getAiEditorProjectSettings(
  projectId: string
): Promise<AiEditorProjectSettings | null> {
  const db = requireDb();
  const snap = await db.collection(AI_EDITOR_PROJECT_SETTINGS_COLLECTION).doc(projectId).get();
  if (!snap.exists) return null;
  return serializeDoc<AiEditorProjectSettings>(snap.id, snap.data()!);
}

export async function upsertAiEditorProjectSettings(
  projectId: string,
  patch: Partial<AiEditorProjectSettings>
): Promise<AiEditorProjectSettings> {
  const db = requireDb();
  const ref = db.collection(AI_EDITOR_PROJECT_SETTINGS_COLLECTION).doc(projectId);
  const existing = await ref.get();
  const now = new Date().toISOString();
  const payload = stripUndefined({
    ...patch,
    id: projectId,
    projectId,
    updatedAt: now,
    createdAt: existing.exists
      ? (existing.data() as AiEditorProjectSettings).createdAt ?? now
      : now,
  });
  await ref.set(payload, { merge: true });
  const snap = await ref.get();
  return serializeDoc<AiEditorProjectSettings>(snap.id, snap.data()!);
}

export async function listStorageLocations(userId: string): Promise<StorageLocation[]> {
  const db = requireDb();
  const snap = await db
    .collection(AI_EDITOR_STORAGE_COLLECTION)
    .where("userId", "==", userId)
    .limit(50)
    .get();
  return snap.docs
    .map((d) => serializeDoc<StorageLocation>(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createStorageLocation(
  appUser: AppUser,
  input: {
    name: string;
    path: string;
    purpose: StoragePurpose;
    type?: StorageType;
  }
): Promise<StorageLocation> {
  assertSafeStoragePath(input.path);
  const db = requireDb();
  const now = new Date().toISOString();
  const ref = db.collection(AI_EDITOR_STORAGE_COLLECTION).doc();
  const doc: StorageLocation = {
    id: ref.id,
    userId: appUser.id,
    organizationCompany: tenantCompany(appUser),
    name: input.name.trim() || "Storage",
    type: input.type ?? "unknown",
    purpose: input.purpose,
    path: input.path.trim(),
    online: true,
    writable: true,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(stripUndefined(doc));
  return doc;
}

export async function listMediaAssets(projectId: string): Promise<MediaAsset[]> {
  const db = requireDb();
  const snap = await db
    .collection(AI_EDITOR_MEDIA_COLLECTION)
    .where("projectId", "==", projectId)
    .limit(MAX_MEDIA_ASSETS)
    .get();
  return snap.docs
    .map((d) => serializeDoc<MediaAsset>(d.id, d.data()))
    .sort((a, b) => a.filename.localeCompare(b.filename));
}

export async function upsertMediaAssets(
  assets: MediaAsset[]
): Promise<MediaAsset[]> {
  const db = requireDb();
  const batch = db.batch();
  for (const asset of assets) {
    const ref = db.collection(AI_EDITOR_MEDIA_COLLECTION).doc(asset.id);
    batch.set(ref, stripUndefined(asset), { merge: true });
  }
  await batch.commit();
  return assets;
}

export async function patchMediaAssets(
  projectId: string,
  patches: Array<{ id: string } & Partial<MediaAsset>>
): Promise<number> {
  const db = requireDb();
  const now = new Date().toISOString();
  const batch = db.batch();
  let count = 0;
  for (const patch of patches) {
    if (!patch.id) continue;
    const ref = db.collection(AI_EDITOR_MEDIA_COLLECTION).doc(patch.id);
    const { id: _id, ...rest } = patch;
    batch.set(
      ref,
      stripUndefined({
        ...rest,
        projectId,
        updatedAt: now,
      }),
      { merge: true }
    );
    count += 1;
  }
  if (count) await batch.commit();
  return count;
}

export async function listJobs(projectId: string): Promise<AiEditorJob[]> {
  const db = requireDb();
  const snap = await db
    .collection(AI_EDITOR_JOBS_COLLECTION)
    .where("projectId", "==", projectId)
    .limit(MAX_JOBS_LISTED)
    .get();
  return snap.docs
    .map((d) => serializeDoc<AiEditorJob>(d.id, d.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createJob(
  appUser: AppUser,
  projectId: string,
  type: AiEditorJobType,
  payload?: Record<string, unknown>
): Promise<AiEditorJob> {
  const db = requireDb();
  const now = new Date().toISOString();
  const ref = db.collection(AI_EDITOR_JOBS_COLLECTION).doc();
  const job: AiEditorJob = {
    id: ref.id,
    projectId,
    userId: appUser.id,
    type,
    status: "queued",
    progress: 0,
    retryCount: 0,
    payload,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(stripUndefined(job));
  return job;
}

export async function updateJob(
  jobId: string,
  patch: Partial<Pick<AiEditorJob, "status" | "progress" | "message" | "error" | "startedAt" | "completedAt">>
): Promise<AiEditorJob> {
  const db = requireDb();
  const ref = db.collection(AI_EDITOR_JOBS_COLLECTION).doc(jobId);
  const now = new Date().toISOString();
  await ref.update(
    stripUndefined({
      ...patch,
      updatedAt: now,
    })
  );
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Job not found after update");
  return serializeDoc<AiEditorJob>(snap.id, snap.data()!);
}

export async function mintAgentSession(
  appUser: AppUser,
  projectId: string,
  agentBaseUrl: string
): Promise<{ token: string; expiresAt: string }> {
  const db = requireDb();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await db.collection(AI_EDITOR_AGENT_SESSIONS_COLLECTION).doc(token).set(
    stripUndefined({
      token,
      projectId,
      userId: appUser.id,
      agentBaseUrl,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    })
  );
  return { token, expiresAt };
}

export async function verifyAgentSession(
  token: string
): Promise<{ projectId: string; userId: string; expiresAt: string } | null> {
  const db = requireDb();
  const snap = await db.collection(AI_EDITOR_AGENT_SESSIONS_COLLECTION).doc(token).get();
  if (!snap.exists) return null;
  const data = snap.data() as { projectId: string; userId: string; expiresAt: string };
  if (Date.parse(data.expiresAt) < Date.now()) return null;
  return {
    projectId: data.projectId,
    userId: data.userId,
    expiresAt: data.expiresAt,
  };
}

export function newMediaAssetId(): string {
  return `ss_media_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function listAnalysisBundles(
  projectId: string
): Promise<ClipAnalysisBundle[]> {
  const db = requireDb();
  const snap = await db
    .collection(AI_EDITOR_ANALYSIS_COLLECTION)
    .where("projectId", "==", projectId)
    .limit(MAX_MEDIA_ASSETS)
    .get();
  return snap.docs.map((d) => {
    const data = d.data() as ClipAnalysisBundle & { projectId?: string };
    return {
      mediaAssetId: data.mediaAssetId || d.id,
      technical: data.technical,
      shots: data.shots ?? [],
      transcript: data.transcript ?? [],
      analysisStatus: data.analysisStatus ?? "none",
      error: data.error,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  });
}

export async function upsertAnalysisBundle(
  projectId: string,
  bundle: ClipAnalysisBundle
): Promise<ClipAnalysisBundle> {
  const db = requireDb();
  const id = `${projectId}_${bundle.mediaAssetId}`;
  const payload = stripUndefined({
    ...bundle,
    projectId,
    id,
    updatedAt: new Date().toISOString(),
  });
  await db.collection(AI_EDITOR_ANALYSIS_COLLECTION).doc(id).set(payload, { merge: true });
  return bundle;
}

export async function getCoverageReport(projectId: string): Promise<CoverageReport | null> {
  const db = requireDb();
  const snap = await db.collection(AI_EDITOR_MATCHING_COLLECTION).doc(projectId).get();
  if (!snap.exists) return null;
  return serializeDoc<CoverageReport>(snap.id, snap.data()!);
}

export async function upsertCoverageReport(report: CoverageReport): Promise<CoverageReport> {
  const db = requireDb();
  const payload = stripUndefined({
    ...report,
    id: report.projectId,
    updatedAt: report.updatedAt || new Date().toISOString(),
  });
  await db
    .collection(AI_EDITOR_MATCHING_COLLECTION)
    .doc(report.projectId)
    .set(payload, { merge: true });
  return report;
}

export async function getTimeline(projectId: string): Promise<Timeline | null> {
  const db = requireDb();
  const snap = await db.collection(AI_EDITOR_TIMELINES_COLLECTION).doc(projectId).get();
  if (!snap.exists) return null;
  return serializeDoc<Timeline>(snap.id, snap.data()!);
}

export async function upsertTimeline(timeline: Timeline): Promise<Timeline> {
  const db = requireDb();
  const payload = stripUndefined({
    ...timeline,
    id: timeline.projectId,
    updatedAt: timeline.updatedAt || new Date().toISOString(),
  });
  await db.collection(AI_EDITOR_TIMELINES_COLLECTION).doc(timeline.projectId).set(payload, {
    merge: true,
  });
  return { ...timeline, id: timeline.projectId };
}

export async function listTimelineVersions(projectId: string): Promise<TimelineVersion[]> {
  const db = requireDb();
  const snap = await db
    .collection(AI_EDITOR_TIMELINE_VERSIONS_COLLECTION)
    .where("projectId", "==", projectId)
    .limit(MAX_TIMELINE_VERSIONS)
    .get();
  return snap.docs
    .map((d) => serializeDoc<TimelineVersion>(d.id, d.data()))
    .sort((a, b) => b.version - a.version);
}

export async function saveTimelineVersion(version: TimelineVersion): Promise<TimelineVersion> {
  const db = requireDb();
  const payload = stripUndefined({ ...version });
  await db.collection(AI_EDITOR_TIMELINE_VERSIONS_COLLECTION).doc(version.id).set(payload, {
    merge: true,
  });
  return version;
}

export type { AiEditorJobStatus };
