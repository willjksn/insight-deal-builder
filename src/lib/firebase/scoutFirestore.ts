import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/config";
import { stripUndefined } from "@/lib/firebase/firestore";
import {
  LightFixture,
  LightingRecipe,
  ScoutGearProfile,
  ScoutGearList,
  ScoutProject,
  ScoutProjectImage,
} from "@/lib/scout/types";

function ensureDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }
  return db;
}

export const SCOUT_PROJECTS_COLLECTION = "shotScoutProjects";

export async function getScoutProjectsForUser(userId: string): Promise<ScoutProject[]> {
  const database = ensureDb();
  const q = query(
    collection(database, SCOUT_PROJECTS_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ScoutProject);
}

export async function getScoutProjectsForLinkedProject(
  linkedProjectId: string
): Promise<ScoutProject[]> {
  const database = ensureDb();
  const q = query(
    collection(database, SCOUT_PROJECTS_COLLECTION),
    where("linkedProjectId", "==", linkedProjectId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ScoutProject);
}

export async function getScoutProject(id: string): Promise<ScoutProject | null> {
  const database = ensureDb();
  const snap = await getDoc(doc(database, SCOUT_PROJECTS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ScoutProject;
}

export async function createScoutProject(
  data: Omit<ScoutProject, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const database = ensureDb();
  const ref = await addDoc(collection(database, SCOUT_PROJECTS_COLLECTION), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateScoutProject(
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const database = ensureDb();
  await updateDoc(doc(database, SCOUT_PROJECTS_COLLECTION, id), {
    ...stripUndefined(data),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteScoutProject(id: string): Promise<void> {
  const database = ensureDb();
  await deleteDoc(doc(database, SCOUT_PROJECTS_COLLECTION, id));
}

function imagesCol(scoutProjectId: string) {
  return collection(ensureDb(), SCOUT_PROJECTS_COLLECTION, scoutProjectId, "images");
}

export async function getScoutProjectImages(scoutProjectId: string): Promise<ScoutProjectImage[]> {
  const q = query(imagesCol(scoutProjectId), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ScoutProjectImage);
}

export async function addScoutProjectImage(
  scoutProjectId: string,
  imageId: string,
  data: Omit<ScoutProjectImage, "id" | "createdAt">
): Promise<string> {
  await setDoc(doc(ensureDb(), SCOUT_PROJECTS_COLLECTION, scoutProjectId, "images", imageId), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
  });
  return imageId;
}

export async function updateScoutProjectImage(
  scoutProjectId: string,
  imageId: string,
  data: Record<string, unknown>
): Promise<void> {
  await updateDoc(
    doc(ensureDb(), SCOUT_PROJECTS_COLLECTION, scoutProjectId, "images", imageId),
    data
  );
}

function gearCol(userId: string) {
  return collection(ensureDb(), "users", userId, "gearProfiles");
}

export async function getGearProfiles(userId: string): Promise<ScoutGearProfile[]> {
  try {
    const q = query(gearCol(userId), orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ScoutGearProfile);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "permission-denied") return [];
    throw err;
  }
}

/** Gear profile IDs from recent scout sessions (most recently used first). */
export async function getRecentGearProfileIds(userId: string, maxCount = 6): Promise<string[]> {
  const database = ensureDb();
  const q = query(
    collection(database, SCOUT_PROJECTS_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(40)
  );
  const snapshot = await getDocs(q);
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const d of snapshot.docs) {
    const profileId = d.data().selectedGearProfileId as string | undefined;
    if (!profileId?.trim() || seen.has(profileId)) continue;
    seen.add(profileId);
    ids.push(profileId);
    if (ids.length >= maxCount) break;
  }
  return ids;
}

export async function createGearProfile(
  userId: string,
  data: Omit<ScoutGearProfile, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(gearCol(userId), {
    ...stripUndefined({ ...data, userId }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGearProfile(
  userId: string,
  gearId: string,
  data: Record<string, unknown>
): Promise<void> {
  await updateDoc(doc(ensureDb(), "users", userId, "gearProfiles", gearId), {
    ...stripUndefined(data),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGearProfile(userId: string, gearId: string): Promise<void> {
  await deleteDoc(doc(ensureDb(), "users", userId, "gearProfiles", gearId));
}

const GEAR_LIST_DOC_ID = "default";

function gearListDoc(userId: string) {
  return doc(ensureDb(), "users", userId, "gearList", GEAR_LIST_DOC_ID);
}

export async function getGearList(userId: string): Promise<ScoutGearList | null> {
  try {
    const snap = await getDoc(gearListDoc(userId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ScoutGearList;
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "permission-denied") return null;
    throw err;
  }
}

export async function saveGearList(
  userId: string,
  data: Omit<ScoutGearList, "id" | "userId" | "updatedAt">
): Promise<void> {
  await setDoc(
    gearListDoc(userId),
    stripUndefined({
      ...data,
      userId,
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );
}

function lightFixturesCol(userId: string) {
  return collection(ensureDb(), "users", userId, "lightFixtures");
}

export async function getLightFixtures(userId: string): Promise<LightFixture[]> {
  const q = query(lightFixturesCol(userId), orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as LightFixture);
}

export async function createLightFixture(
  userId: string,
  data: Omit<LightFixture, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(lightFixturesCol(userId), {
    ...stripUndefined({ ...data, userId }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateLightFixture(
  userId: string,
  fixtureId: string,
  data: Record<string, unknown>
): Promise<void> {
  await updateDoc(doc(ensureDb(), "users", userId, "lightFixtures", fixtureId), {
    ...stripUndefined(data),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLightFixture(userId: string, fixtureId: string): Promise<void> {
  await deleteDoc(doc(ensureDb(), "users", userId, "lightFixtures", fixtureId));
}

function lightingRecipesCol(userId: string) {
  return collection(ensureDb(), "users", userId, "lightingRecipes");
}

export async function getLightingRecipes(userId: string): Promise<LightingRecipe[]> {
  const q = query(lightingRecipesCol(userId), orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as LightingRecipe);
}

export async function createLightingRecipe(
  userId: string,
  data: Omit<LightingRecipe, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(lightingRecipesCol(userId), {
    ...stripUndefined({ ...data, userId }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function duplicateScoutProject(
  userId: string,
  sourceId: string
): Promise<string> {
  const source = await getScoutProject(sourceId);
  if (!source || source.userId !== userId) {
    throw new Error("Session not found");
  }
  const { id: _id, createdAt: _c, updatedAt: _u, latestAnalysis, latestDpPlan, latestShotList, latestPreviews, thumbnailUrl, bestImageId, bestImageUrl, ...rest } = source;
  return createScoutProject({
    ...rest,
    userId,
    projectName: `${source.projectName} (copy)`,
    status: "draft",
  });
}
