import { randomUUID } from "crypto";
import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { hasGlobalProjectAdmin } from "@/lib/projectAccess/server";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { AppUser } from "@/lib/types";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";
import {
  ScriptSeries,
  ScriptSeriesCharacter,
  ScriptSeriesCreateInput,
  ScriptSeriesEntry,
  ScriptSeriesEntryKind,
  ScriptSeriesUpdateInput,
  SCRIPT_SERIES_COLLECTION,
} from "@/lib/scriptWriter/series/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

/** Trim + drop empties; assign ids to recurring characters missing one. */
function sanitizeCharacters(
  input: ScriptSeriesCharacter[] | undefined
): ScriptSeriesCharacter[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((c) => ({
      id: c.id?.trim() || randomUUID(),
      name: (c.name ?? "").trim(),
      role: c.role?.trim() || undefined,
      description: c.description?.trim() || undefined,
    }))
    .filter((c) => c.name.length > 0)
    .map((c) => stripUndefined(c) as ScriptSeriesCharacter);
}

function sanitizeMotifs(input: string[] | undefined): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((m) => (m ?? "").trim()).filter((m) => m.length > 0).slice(0, 30);
}

/** Only the owner or a global project admin may read/write a series. */
function assertSeriesAccess(series: ScriptSeries, uid: string, appUser: AppUser): void {
  if (series.ownerUserId === uid) return;
  if (hasGlobalProjectAdmin(appUser)) return;
  throw new Error("Not authorized");
}

export async function listScriptSeries(uid: string, appUser: AppUser): Promise<ScriptSeries[]> {
  const db = requireDb();
  const col = db.collection(SCRIPT_SERIES_COLLECTION);
  let snap;
  if (hasGlobalProjectAdmin(appUser)) {
    try {
      snap = await col.orderBy("updatedAt", "desc").limit(100).get();
    } catch {
      snap = await col.limit(100).get();
    }
  } else {
    try {
      snap = await col.where("ownerUserId", "==", uid).orderBy("updatedAt", "desc").limit(100).get();
    } catch {
      snap = await col.where("ownerUserId", "==", uid).limit(100).get();
    }
  }
  return snap.docs.map((d) => serializeDoc<ScriptSeries>(d.id, d.data()));
}

export async function getScriptSeries(
  id: string,
  uid: string,
  appUser: AppUser
): Promise<ScriptSeries> {
  const db = requireDb();
  const snap = await db.collection(SCRIPT_SERIES_COLLECTION).doc(id).get();
  if (!snap.exists) throw new Error("Series not found");
  const series = serializeDoc<ScriptSeries>(snap.id, snap.data()!);
  assertSeriesAccess(series, uid, appUser);
  return series;
}

export async function createScriptSeries(
  uid: string,
  input: ScriptSeriesCreateInput,
  opts?: { allowSpicy?: boolean }
): Promise<ScriptSeries> {
  const db = requireDb();
  const title = (input.title ?? "").trim();
  if (!title) throw new Error("Series title is required");

  const payload = stripUndefined({
    ownerUserId: uid,
    title,
    premise: input.premise?.trim() || undefined,
    theme: input.theme?.trim() || undefined,
    world: input.world?.trim() || undefined,
    tone: input.tone?.trim() || undefined,
    genre: input.genre?.trim() || undefined,
    lookAndFeel: input.lookAndFeel?.trim() || undefined,
    motifs: sanitizeMotifs(input.motifs),
    recurringCharacters: sanitizeCharacters(input.recurringCharacters),
    spicyMode: opts?.allowSpicy ? Boolean(input.spicyMode) : false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const ref = await db.collection(SCRIPT_SERIES_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<ScriptSeries>(ref.id, snap.data()!);
}

export async function updateScriptSeries(
  id: string,
  uid: string,
  appUser: AppUser,
  input: ScriptSeriesUpdateInput,
  opts?: { allowSpicy?: boolean }
): Promise<ScriptSeries> {
  const db = requireDb();
  const ref = db.collection(SCRIPT_SERIES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Series not found");
  const current = serializeDoc<ScriptSeries>(existing.id, existing.data()!);
  assertSeriesAccess(current, uid, appUser);

  const update = stripUndefined({
    title: input.title !== undefined ? input.title.trim() || current.title : undefined,
    premise: input.premise !== undefined ? input.premise.trim() || undefined : undefined,
    theme: input.theme !== undefined ? input.theme.trim() || undefined : undefined,
    world: input.world !== undefined ? input.world.trim() || undefined : undefined,
    tone: input.tone !== undefined ? input.tone.trim() || undefined : undefined,
    genre: input.genre !== undefined ? input.genre.trim() || undefined : undefined,
    lookAndFeel:
      input.lookAndFeel !== undefined ? input.lookAndFeel.trim() || undefined : undefined,
    motifs: input.motifs !== undefined ? sanitizeMotifs(input.motifs) : undefined,
    recurringCharacters:
      input.recurringCharacters !== undefined
        ? sanitizeCharacters(input.recurringCharacters)
        : undefined,
    spicyMode:
      input.spicyMode !== undefined
        ? opts?.allowSpicy
          ? Boolean(input.spicyMode)
          : false
        : undefined,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await ref.update(update);
  const snap = await ref.get();
  return serializeDoc<ScriptSeries>(snap.id, snap.data()!);
}

export async function deleteScriptSeries(
  id: string,
  uid: string,
  appUser: AppUser
): Promise<void> {
  const db = requireDb();
  const ref = db.collection(SCRIPT_SERIES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Series not found");
  const current = serializeDoc<ScriptSeries>(existing.id, existing.data()!);
  assertSeriesAccess(current, uid, appUser);

  // Detach any entries so their sessions survive as standalone scripts.
  const entrySnap = await db
    .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
    .where("seriesId", "==", id)
    .limit(100)
    .get();
  await Promise.all(
    entrySnap.docs.map((d) =>
      d.ref.update({
        seriesId: FieldValue.delete(),
        seriesEntryKind: FieldValue.delete(),
        seriesOrder: FieldValue.delete(),
      })
    )
  );

  await ref.delete();
}

/** All sessions tagged with this series, ordered by seriesOrder ascending. */
export async function listSeriesEntries(seriesId: string): Promise<ScriptSeriesEntry[]> {
  const db = requireDb();
  const snap = await db
    .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
    .where("seriesId", "==", seriesId)
    .limit(100)
    .get();
  return snap.docs
    .map((d) => {
      const data = d.data() as Partial<ScriptWriterSession>;
      return {
        sessionId: d.id,
        title: data.title || "Untitled",
        entryKind: (data.seriesEntryKind as ScriptSeriesEntryKind) || "episode",
        order: typeof data.seriesOrder === "number" ? data.seriesOrder : 0,
        recap: data.seriesRecap,
        status: data.status,
      } satisfies ScriptSeriesEntry;
    })
    .sort((a, b) => a.order - b.order);
}

/** Next 1-based order value for a new entry appended to the series. */
export async function nextSeriesOrder(seriesId: string): Promise<number> {
  const entries = await listSeriesEntries(seriesId);
  return entries.reduce((max, e) => Math.max(max, e.order), 0) + 1;
}

/**
 * Load a series and the recaps of entries that come BEFORE this session, used
 * to inject "story so far" continuity into generation.
 */
export async function loadSeriesContinuity(
  session: Pick<ScriptWriterSession, "id" | "seriesId" | "seriesOrder">
): Promise<{ series: ScriptSeries; priorEntries: ScriptSeriesEntry[] } | null> {
  if (!session.seriesId) return null;
  const db = requireDb();
  const snap = await db.collection(SCRIPT_SERIES_COLLECTION).doc(session.seriesId).get();
  if (!snap.exists) return null;
  const series = serializeDoc<ScriptSeries>(snap.id, snap.data()!);
  const entries = await listSeriesEntries(session.seriesId);
  const order = typeof session.seriesOrder === "number" ? session.seriesOrder : Infinity;
  const priorEntries = entries.filter(
    (e) => e.sessionId !== session.id && e.order < order
  );
  return { series, priorEntries };
}
