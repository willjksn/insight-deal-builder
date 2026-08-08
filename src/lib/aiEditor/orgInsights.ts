/**
 * V19 — load opted-in teammates’ AI Editor settings for org pattern rollups.
 * Metadata only; never project names in the response; never media bytes.
 */

import type { AppUser } from "@/lib/types";
import { AI_EDITOR_PROJECT_SETTINGS_COLLECTION } from "@/lib/aiEditor/collections";
import {
  buildCrossProjectInsights,
  type CrossProjectSource,
  type OrgInsightsSummary,
} from "@/lib/aiEditor/crossProjectInsights";
import type { AiEditorProjectSettings } from "@/lib/aiEditor/types";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type { Firestore } from "firebase-admin/firestore";

const MAX_ORG_USERS = 40;
const MAX_PROJECTS_PER_USER = 20;
const MAX_ORG_PROJECTS = 120;

export function orgAnalyticsCompany(appUser: AppUser): string | null {
  const company = appUser.company?.trim();
  return company || null;
}

export function hasOptedInToOrgAnalytics(appUser: AppUser): boolean {
  return appUser.aiEditorShareOrgAnalytics === true;
}

/** Build org insights for callers who opted in and have a company. */
export async function loadOrgInsightsSummary(
  db: Firestore,
  appUser: AppUser
): Promise<OrgInsightsSummary> {
  const company = orgAnalyticsCompany(appUser);
  const optedIn = hasOptedInToOrgAnalytics(appUser);

  if (!company || !optedIn) {
    return {
      enabled: false,
      optedIn,
      company,
      contributorCount: 0,
      projectCount: 0,
      withDataCount: 0,
      insights: [],
    };
  }

  const usersSnap = await db
    .collection("users")
    .where("company", "==", company)
    .limit(MAX_ORG_USERS)
    .get();

  const contributorIds = usersSnap.docs
    .filter((d) => d.data().aiEditorShareOrgAnalytics === true)
    .map((d) => d.id);

  if (!contributorIds.length) {
    return {
      enabled: true,
      optedIn: true,
      company,
      contributorCount: 0,
      projectCount: 0,
      withDataCount: 0,
      insights: [
        {
          id: "empty",
          text: "You’re opted in. Patterns appear when you and teammates finish a few edits.",
          weight: 0,
        },
      ],
    };
  }

  const sources: CrossProjectSource[] = [];
  for (const ownerId of contributorIds) {
    if (sources.length >= MAX_ORG_PROJECTS) break;
    const remaining = MAX_ORG_PROJECTS - sources.length;
    const projSnap = await db
      .collection("projects")
      .where("ownerUserId", "==", ownerId)
      .limit(Math.min(MAX_PROJECTS_PER_USER, remaining))
      .get();

    const projects = projSnap.docs.map((d) => ({
      projectId: d.id,
      // Anonymize — never surface teammate project names in org insights
      projectName: "Project",
    }));

    const chunkSize = 30;
    for (let i = 0; i < projects.length; i += chunkSize) {
      const chunk = projects.slice(i, i + chunkSize);
      const refs = chunk.map((p) =>
        db.collection(AI_EDITOR_PROJECT_SETTINGS_COLLECTION).doc(p.projectId)
      );
      if (!refs.length) continue;
      const docs = await db.getAll(...refs);
      const byId = new Map(
        docs
          .filter((d) => d.exists)
          .map((d) => [
            d.id,
            serializeDoc<AiEditorProjectSettings>(d.id, d.data()!),
          ])
      );
      for (const p of chunk) {
        sources.push({
          projectId: p.projectId,
          projectName: p.projectName,
          settings: byId.get(p.projectId) || null,
        });
      }
    }
  }

  const summary = buildCrossProjectInsights(sources, {
    voice: "org",
    includeRecommendations: false,
  });

  return {
    enabled: true,
    optedIn: true,
    company,
    contributorCount: contributorIds.length,
    projectCount: summary.projectCount,
    withDataCount: summary.withDataCount,
    insights: summary.insights,
  };
}
