import { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { emailAccessKey, companyAccessKey } from "@/lib/agreement/access";
import { mergeCalendarEvents } from "@/lib/calendar/buildEvents";
import { CalendarEvent } from "@/lib/calendar/types";
import { PRODUCTION_BOARDS_COLLECTION } from "@/lib/firebase/productionFirestore";
import { getProjectIdsForMember, hasGlobalProjectAdmin } from "@/lib/projectAccess/server";
import {
  canSeeAllAgreements,
  canViewAllOrgDeals,
} from "@/lib/utils/permissions";
import { Agreement, AppUser, Project } from "@/lib/types";
import { ProductionBoard } from "@/lib/production/types";

async function listAccessibleProjects(
  db: Firestore,
  uid: string,
  appUser: AppUser
): Promise<Project[]> {
  if (hasGlobalProjectAdmin(appUser)) {
    const snap = await db.collection("projects").orderBy("updatedAt", "desc").limit(200).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project);
  }

  const projectIds = await getProjectIdsForMember(db, uid);
  const projects: Project[] = [];
  for (const projectId of projectIds) {
    const snap = await db.collection("projects").doc(projectId).get();
    if (snap.exists) {
      projects.push({ id: snap.id, ...snap.data() } as Project);
    }
  }
  return projects;
}

async function listAccessibleAgreements(
  db: Firestore,
  appUser: AppUser,
  email: string | null | undefined
): Promise<Agreement[]> {
  const seen = new Map<string, Agreement>();

  if (canSeeAllAgreements(appUser)) {
    const snap = await db.collection("agreements").limit(300).get();
    for (const doc of snap.docs) {
      seen.set(doc.id, { id: doc.id, ...doc.data() } as Agreement);
    }
    return Array.from(seen.values());
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    const snap = await db
      .collection("agreements")
      .where("accessKeys", "array-contains", emailAccessKey(normalizedEmail))
      .limit(200)
      .get();
    for (const doc of snap.docs) {
      seen.set(doc.id, { id: doc.id, ...doc.data() } as Agreement);
    }
  }

  const company = appUser.company?.trim();
  if (company && (canViewAllOrgDeals(appUser) || !normalizedEmail)) {
    const snap = await db
      .collection("agreements")
      .where("accessKeys", "array-contains", companyAccessKey(company))
      .limit(200)
      .get();
    for (const doc of snap.docs) {
      seen.set(doc.id, { id: doc.id, ...doc.data() } as Agreement);
    }
  }

  return Array.from(seen.values());
}

async function listProductionBoardsForProjects(
  db: Firestore,
  projectIds: string[]
): Promise<ProductionBoard[]> {
  const boards: ProductionBoard[] = [];
  for (const projectId of projectIds) {
    const snap = await db
      .collection(PRODUCTION_BOARDS_COLLECTION)
      .where("projectId", "==", projectId)
      .limit(1)
      .get();
    for (const doc of snap.docs) {
      boards.push({ id: doc.id, ...doc.data() } as ProductionBoard);
    }
  }
  return boards;
}

export async function loadCalendarEventsForUser(params: {
  uid: string;
  appUser: AppUser;
  email: string | null | undefined;
}): Promise<CalendarEvent[]> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const projects = await listAccessibleProjects(db, params.uid, params.appUser);
  const projectIds = projects.map((p) => p.id);
  const [boards, agreements] = await Promise.all([
    listProductionBoardsForProjects(db, projectIds),
    listAccessibleAgreements(db, params.appUser, params.email),
  ]);

  return mergeCalendarEvents(projects, boards, agreements);
}
