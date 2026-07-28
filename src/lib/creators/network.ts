import type { Creator } from "@/lib/creators/types";
import { isOpenApplication } from "@/lib/creators/types";
import type {
  CreatorMatchResult,
  CreatorNetworkFilters,
  CreatorNetworkSummary,
} from "@/lib/creators/opsTypes";

/** Apply network filters client- or server-side. */
export function filterCreators(creators: Creator[], filters: CreatorNetworkFilters): Creator[] {
  const q = filters.q?.trim().toLowerCase();
  return creators.filter((c) => {
    if (filters.applicantsOnly && c.relationshipType !== "applicant" && !c.applicationStatus) {
      return false;
    }
    if (filters.relationshipTypes?.length && !filters.relationshipTypes.includes(c.relationshipType)) {
      return false;
    }
    if (filters.statuses?.length && !filters.statuses.includes(c.status)) {
      return false;
    }
    if (filters.readinessStatuses?.length && !filters.readinessStatuses.includes(c.readinessStatus)) {
      return false;
    }
    if (filters.location) {
      const loc = (c.location ?? "").toLowerCase();
      if (!loc.includes(filters.location.toLowerCase())) return false;
    }
    if (filters.niches?.length) {
      const niches = [c.primaryNiche, ...(c.secondaryNiches ?? [])]
        .filter(Boolean)
        .map((n) => n!.toLowerCase());
      if (!filters.niches.some((n) => niches.some((x) => x.includes(n.toLowerCase())))) {
        return false;
      }
    }
    if (filters.platforms?.length) {
      const plats = (c.platforms ?? []).map((p) => p.platform);
      if (!filters.platforms.some((p) => plats.includes(p as typeof plats[number]))) return false;
    }
    if (filters.tags?.length) {
      const tags = (c.tags ?? []).map((t) => t.toLowerCase());
      if (!filters.tags.some((t) => tags.includes(t.toLowerCase()))) return false;
    }
    if (filters.availableOnly) {
      if (c.readinessStatus === "temporarily_unavailable") return false;
      if (c.status !== "active") return false;
    }
    if (q) {
      const hay = [
        c.professionalName,
        c.email,
        c.primaryNiche,
        c.location,
        ...(c.tags ?? []),
        ...(c.platforms ?? []).map((p) => p.handle ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function buildCreatorNetworkSummary(creators: Creator[]): CreatorNetworkSummary {
  const roster = creators.filter((c) => c.relationshipType !== "applicant");
  const byRelationship: Record<string, number> = {};
  const byReadiness: Record<string, number> = {};
  const byNiche: Record<string, number> = {};
  let totalFollowers = 0;

  for (const c of roster) {
    byRelationship[c.relationshipType] = (byRelationship[c.relationshipType] ?? 0) + 1;
    byReadiness[c.readinessStatus] = (byReadiness[c.readinessStatus] ?? 0) + 1;
    if (c.primaryNiche) {
      byNiche[c.primaryNiche] = (byNiche[c.primaryNiche] ?? 0) + 1;
    }
    for (const p of c.platforms ?? []) {
      totalFollowers += p.followers ?? 0;
    }
  }

  const applicants = creators.filter(
    (c) => c.relationshipType === "applicant" || isOpenApplication(c.applicationStatus)
  );

  return {
    totalActive: roster.filter((c) => c.status === "active").length,
    campaignReady: roster.filter(
      (c) => c.readinessStatus === "campaign_ready" || c.readinessStatus === "preferred"
    ).length,
    preferred: roster.filter((c) => c.readinessStatus === "preferred").length,
    needsDevelopment: roster.filter((c) => c.readinessStatus === "needs_development").length,
    temporarilyUnavailable: roster.filter(
      (c) => c.readinessStatus === "temporarily_unavailable"
    ).length,
    openApplications: applicants.filter((c) => isOpenApplication(c.applicationStatus)).length,
    byRelationship,
    byReadiness,
    byNiche,
    totalFollowers,
    recentApplicants: applicants
      .slice()
      .sort((a, b) =>
        (b.applicationSubmittedAt ?? b.createdAt).localeCompare(
          a.applicationSubmittedAt ?? a.createdAt
        )
      )
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.professionalName,
        submittedAt: c.applicationSubmittedAt,
      })),
  };
}

export interface MatchBrief {
  requiredNiche?: string;
  requiredPlatforms?: string[];
  locationPreference?: string;
  brandCategory?: string;
  audienceNotes?: string;
  excludeUnavailable?: boolean;
}

/** Explainable rule-based creator matcher (no invented fit claims). */
export function scoreCreatorMatch(creator: Creator, brief: MatchBrief): CreatorMatchResult {
  let score = 0;
  const reasons: string[] = [];

  if (creator.status === "active") {
    score += 10;
    reasons.push("Active on roster");
  } else {
    reasons.push("Not active");
  }

  if (creator.readinessStatus === "preferred") {
    score += 30;
    reasons.push("Preferred creator");
  } else if (creator.readinessStatus === "campaign_ready") {
    score += 25;
    reasons.push("Campaign ready");
  } else if (creator.readinessStatus === "nearly_ready") {
    score += 15;
    reasons.push("Nearly ready");
  } else if (creator.readinessStatus === "needs_development") {
    score += 5;
    reasons.push("Needs development");
  } else if (creator.readinessStatus === "temporarily_unavailable") {
    score -= 20;
    reasons.push("Temporarily unavailable");
  }

  if (brief.requiredNiche) {
    const niche = brief.requiredNiche.toLowerCase();
    const creatorNiches = [creator.primaryNiche, ...(creator.secondaryNiches ?? [])]
      .filter(Boolean)
      .map((n) => n!.toLowerCase());
    if (creatorNiches.some((n) => n.includes(niche) || niche.includes(n))) {
      score += 25;
      reasons.push(`Niche match: ${creator.primaryNiche ?? niche}`);
    } else if (creator.commercialCategories?.some((c) => c.toLowerCase().includes(niche))) {
      score += 15;
      reasons.push("Commercial category overlap");
    } else {
      reasons.push("No niche overlap found");
    }
  }

  if (brief.requiredPlatforms?.length) {
    const plats = (creator.platforms ?? []).map((p) => p.platform);
    const hits = brief.requiredPlatforms.filter((p) => plats.includes(p as typeof plats[number]));
    if (hits.length) {
      score += Math.min(20, hits.length * 8);
      reasons.push(`Platforms: ${hits.join(", ")}`);
    } else {
      reasons.push("Required platforms not listed on profile");
    }
  }

  if (brief.locationPreference) {
    const loc = (creator.location ?? "").toLowerCase();
    if (loc && loc.includes(brief.locationPreference.toLowerCase())) {
      score += 10;
      reasons.push(`Location: ${creator.location}`);
    } else if (creator.remoteAvailable) {
      score += 5;
      reasons.push("Remote available");
    }
  }

  if (creator.rates?.length) {
    score += 5;
    reasons.push("Rate card on file");
  }
  if (creator.documents?.some((d) => d.kind === "media_kit")) {
    score += 5;
    reasons.push("Media kit on file");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    creatorId: creator.id,
    creatorName: creator.professionalName,
    score,
    reasons,
    readinessStatus: creator.readinessStatus,
    primaryNiche: creator.primaryNiche,
    location: creator.location,
  };
}

export function rankCreatorsForBrief(
  creators: Creator[],
  brief: MatchBrief,
  limit = 10
): CreatorMatchResult[] {
  const pool = creators.filter((c) => {
    if (c.relationshipType === "applicant") return false;
    if (brief.excludeUnavailable !== false && c.readinessStatus === "temporarily_unavailable") {
      return false;
    }
    return c.status === "active";
  });

  return pool
    .map((c) => scoreCreatorMatch(c, brief))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function computeCampaignMargin(economics: {
  clientRevenue?: number;
  creatorCompensationTotal?: number;
  directCosts?: number;
}): number | undefined {
  const revenue = economics.clientRevenue ?? 0;
  const creator = economics.creatorCompensationTotal ?? 0;
  const costs = economics.directCosts ?? 0;
  if (!revenue && !creator && !costs) return undefined;
  return revenue - creator - costs;
}
