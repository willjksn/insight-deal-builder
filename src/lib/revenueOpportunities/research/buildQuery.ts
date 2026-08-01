import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import type { BusinessProfile } from "@/lib/revenueOpportunities/types/businessProfile";

/** Extra search terms drawn from a linked profile's targeting fields. */
export function profileQueryTerms(profile: BusinessProfile): string[] {
  const f = profile.fields ?? {};
  return [
    ...(f.keywords ?? []),
    ...(f.idealCustomers ?? []),
    ...(f.idealBrands ?? []),
  ]
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Multi-angle Tavily queries for IMG local-business discovery. */
export function buildImgResearchQueryPlan(
  campaign: RevenueCampaign,
  profile?: BusinessProfile | null
): string[] {
  const img = campaign.img;
  const year = new Date().getFullYear();
  const location = [img?.city, img?.state].filter(Boolean).join(", ") || "Orlando, FL";
  const industry = img?.industry?.trim() || "local businesses";
  const niche = img?.subNiche?.trim();
  const focus = niche ? `${industry} ${niche}` : industry;
  const radius = img?.radiusMiles ?? 35;
  const signals = (campaign.requiredSignals ?? []).filter(Boolean).slice(0, 3);
  const signalClause = signals.length ? signals.join(" ") : "renovation expansion grand opening hiring";

  const queries = [
    `${focus} ${location} directory list businesses within ${radius} miles`,
    `${focus} ${location} ${signalClause} ${year}`,
    `${focus} ${location} Instagram TikTok marketing video content brand`,
    `${focus} ${location} weak social media needs video photography production`,
  ];

  if (campaign.additionalInstructions?.trim()) {
    queries.push(`${focus} ${location} ${campaign.additionalInstructions.trim().slice(0, 120)}`);
  }

  if (profile) {
    const terms = profileQueryTerms(profile).slice(0, 4);
    if (terms.length) queries.push(`${focus} ${location} ${terms.join(" ")}`);
  }

  return queries.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** Multi-angle Tavily queries for Stormi brand partnerships. */
export function buildStormiResearchQueryPlan(
  campaign: RevenueCampaign,
  profile?: BusinessProfile | null
): string[] {
  const stormi = campaign.stormi;
  const year = new Date().getFullYear();
  const category = stormi?.brandCategory?.trim() || "beauty lifestyle brands";
  const geo = stormi?.geographicPreference?.trim() || "United States";
  const product = stormi?.productType?.trim();
  const partnership = stormi?.desiredPartnershipType?.trim() || "creator partnership";

  const queries = [
    `${category} ${product ?? ""} ${geo} brand list ${year}`.replace(/\s+/g, " ").trim(),
    `${category} ${geo} ${partnership} influencer collaboration campaign`,
    `${category} brands Instagram TikTok creator marketing ${year}`,
    `${category} ${geo} brand looking for UGC creator video partnership`,
  ];

  if (campaign.additionalInstructions?.trim()) {
    queries.push(`${category} ${geo} ${campaign.additionalInstructions.trim().slice(0, 120)}`);
  }

  if (profile) {
    const terms = profileQueryTerms(profile).slice(0, 4);
    if (terms.length) queries.push(`${category} ${geo} ${terms.join(" ")}`);
  }

  return queries.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/**
 * Authoritative identity + targeting context from a linked business profile.
 * Layered on top of the built-in persona so the profile steers discovery,
 * qualification, and scoring emphasis.
 */
export function buildProfileContextLines(profile: BusinessProfile): string[] {
  const f = profile.fields ?? {};
  const lines: string[] = [
    "",
    "=== LINKED BUSINESS PROFILE (authoritative identity + targeting — prioritize this) ===",
    `Profile: ${profile.name} (${profile.profileType})`,
  ];
  const push = (label: string, val?: string) => {
    if (val && val.trim()) lines.push(`${label}: ${val.trim()}`);
  };
  const pushList = (label: string, arr?: string[]) => {
    const v = (arr ?? []).map((s) => s.trim()).filter(Boolean);
    if (v.length) lines.push(`${label}: ${v.join("; ")}`);
  };

  push("Who we are", f.description);
  pushList("Services / offerings", f.services);
  pushList("Signature offers", f.offers);
  pushList("Ideal customers", f.idealCustomers);
  pushList("Ideal brands", f.idealBrands);
  pushList("Target industries", f.industries);
  pushList("Geography", f.geography);
  push("Creator niche", f.creatorNiche);
  push("Content style", f.contentStyle);
  pushList("Search keywords (prefer)", f.keywords);
  pushList("Negative keywords (avoid)", f.negativeKeywords);
  pushList("Disqualifiers (skip)", f.disqualifiers);
  pushList("Disallowed industries", f.disallowedIndustries);
  pushList("Brand-safety restrictions", f.brandSafetyRestrictions);
  if (f.minimumProjectValue != null) push("Minimum project value", `$${f.minimumProjectValue}`);
  return lines;
}

/** @deprecated use buildImgResearchQueryPlan */
export function buildImgResearchQuery(campaign: RevenueCampaign): string {
  return buildImgResearchQueryPlan(campaign)[0] ?? "";
}

/** @deprecated use buildStormiResearchQueryPlan */
export function buildStormiResearchQuery(campaign: RevenueCampaign): string {
  return buildStormiResearchQueryPlan(campaign)[0] ?? "";
}

export function buildCampaignContextLines(
  campaign: RevenueCampaign,
  profile?: BusinessProfile | null,
  pastRejectionLabels?: string[]
): string[] {
  const lines = [
    `Campaign: ${campaign.name}`,
    `Type: ${campaign.campaignType}`,
    `Objective: ${campaign.objective ?? "Find qualified opportunities"}`,
    `Minimum opportunity score: ${campaign.minOpportunityScore}`,
    `Minimum confidence: ${campaign.minConfidenceScore}`,
    `Opportunities requested: ${campaign.opportunityCountRequested}`,
  ];

  if (pastRejectionLabels?.length) {
    lines.push(
      `Past rejection reasons to avoid repeating (org learning): ${pastRejectionLabels.join("; ")}`
    );
  }

  if (campaign.requiredSignals?.length) {
    lines.push(`Required signals (prefer these): ${campaign.requiredSignals.join("; ")}`);
  }
  if (campaign.exclusions?.length) {
    lines.push(`Exclusions (skip): ${campaign.exclusions.join("; ")}`);
  }
  if (campaign.additionalInstructions?.trim()) {
    lines.push(`Additional instructions: ${campaign.additionalInstructions.trim()}`);
  }

  if (campaign.img) {
    lines.push(
      `Industry: ${campaign.img.industry ?? "—"}`,
      campaign.img.subNiche ? `Sub-niche: ${campaign.img.subNiche}` : "",
      `Location: ${campaign.img.city ?? ""}, ${campaign.img.state ?? ""} (${campaign.img.radiusMiles ?? 35} mi)`,
      `Service to promote: ${campaign.img.serviceToPromote ?? "Business Brand Package"}`,
      campaign.img.minimumProjectValue != null
        ? `Minimum project value: $${campaign.img.minimumProjectValue}`
        : "",
      campaign.img.excludedCompanies?.length
        ? `Excluded companies: ${campaign.img.excludedCompanies.join("; ")}`
        : "",
      campaign.img.excludedBusinessTypes?.length
        ? `Excluded business types: ${campaign.img.excludedBusinessTypes.join("; ")}`
        : ""
    );
  }

  if (campaign.stormi) {
    const scope = campaign.stormi.creatorScope ?? "network";
    const scopeLine =
      scope === "stormi_flagship"
        ? "Creator scope: Stormi flagship (single-creator brand deals)"
        : scope === "specific"
          ? `Creator scope: specific roster creators (${(campaign.stormi.linkedCreatorIds ?? []).length} linked)`
          : "Creator scope: IMG creator network (multi-creator / UGC / represented)";
    lines.push(
      `Track: Creator brand partnerships (Stormi & network — not IMG production BD)`,
      scopeLine,
      `Brand category: ${campaign.stormi.brandCategory ?? "—"}`,
      `Partnership type: ${campaign.stormi.desiredPartnershipType ?? "—"}`,
      `Geography: ${campaign.stormi.geographicPreference ?? "—"}`,
      campaign.stormi.brandExclusions?.length
        ? `Brand exclusions: ${campaign.stormi.brandExclusions.join("; ")}`
        : ""
    );
  }

  if (profile) {
    lines.push(...buildProfileContextLines(profile));
  }

  return lines.filter(Boolean);
}

export function buildEnrichContextLines(
  campaign: RevenueCampaign,
  candidate: { name: string; website?: string; city?: string; state?: string; industry?: string; whyInteresting?: string },
  profile?: BusinessProfile | null
): string[] {
  return [
    ...buildCampaignContextLines(campaign, profile),
    "",
    "=== CANDIDATE TO QUALIFY (deep research) ===",
    `Name: ${candidate.name}`,
    candidate.website ? `Website: ${candidate.website}` : "Website: unknown",
    candidate.city || candidate.state
      ? `Location hint: ${[candidate.city, candidate.state].filter(Boolean).join(", ")}`
      : "",
    candidate.industry ? `Industry hint: ${candidate.industry}` : "",
    candidate.whyInteresting ? `Why shortlisted: ${candidate.whyInteresting}` : "",
    "Research this specific business deeply. Prefer facts from its website, Google/listings, and social profiles.",
  ].filter(Boolean);
}

export function buildConceptContextLines(
  subjectName: string,
  industry?: string,
  campaignName?: string
): string[] {
  return [
    `Subject: ${subjectName}`,
    industry ? `Industry: ${industry}` : "",
    campaignName ? `Campaign: ${campaignName}` : "",
    "Insight Media Group produces cinematic video/photo for businesses.",
    "Creator brand track covers Stormi (flagship) and the IMG creator network for brand partnerships.",
  ].filter(Boolean);
}

export function exclusionTerms(campaign: RevenueCampaign): string[] {
  const terms = [
    ...(campaign.exclusions ?? []),
    ...(campaign.img?.excludedCompanies ?? []),
    ...(campaign.img?.excludedBusinessTypes ?? []),
    ...(campaign.stormi?.brandExclusions ?? []),
  ];
  return terms.map((t) => t.trim().toLowerCase()).filter(Boolean);
}

export function isExcludedName(name: string, campaign: RevenueCampaign): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return true;
  return exclusionTerms(campaign).some((term) => n.includes(term) || term.includes(n));
}
