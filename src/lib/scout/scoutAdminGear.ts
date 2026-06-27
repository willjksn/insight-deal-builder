import { getAdminDb } from "@/lib/firebase/admin";
import { ScoutGearList, ScoutGearProfile, ScoutProject } from "@/lib/scout/types";

const GEAR_LIST_DOC_ID = "default";

export async function loadGearProfileForProject(
  userId: string,
  project: Pick<ScoutProject, "selectedGearProfileId">
): Promise<ScoutGearProfile | null> {
  const profileId = project.selectedGearProfileId?.trim();
  if (!profileId) return null;

  const db = getAdminDb();
  if (!db) return null;

  const snap = await db.collection("users").doc(userId).collection("gearProfiles").doc(profileId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as ScoutGearProfile;
}

export async function loadGearList(userId: string): Promise<ScoutGearList | null> {
  const db = getAdminDb();
  if (!db) return null;

  const snap = await db.collection("users").doc(userId).collection("gearList").doc(GEAR_LIST_DOC_ID).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as ScoutGearList;
}

export async function loadScoutGearContext(
  userId: string,
  project: Pick<ScoutProject, "selectedGearProfileId">
): Promise<{ gearProfile: ScoutGearProfile | null; gearList: ScoutGearList | null }> {
  const [gearProfile, gearList] = await Promise.all([
    loadGearProfileForProject(userId, project),
    loadGearList(userId),
  ]);
  return { gearProfile, gearList };
}
