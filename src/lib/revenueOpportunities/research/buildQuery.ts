import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";

/** Multi-angle Tavily queries for IMG local-business discovery. */
export function buildImgResearchQueryPlan(campaign: RevenueCampaign): string[] {
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

  return queries.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** Multi-angle Tavily queries for Stormi brand partnerships. */
export function buildStormiResearchQueryPlan(campaign: RevenueCampaign): string[] {
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

  return queries.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** @deprecated use buildImgResearchQueryPlan */
export function buildImgResearchQuery(campaign: RevenueCampaign): string {
  return buildImgResearchQueryPlan(campaign)[0] ?? "";
}

/** @deprecated use buildStormiResearchQueryPlan */
export function buildStormiResearchQuery(campaign: RevenueCampaign): string {
  return buildStormiResearchQueryPlan(campaign)[0] ?? "";
}

export function buildCampaignContextLines(campaign: RevenueCampaign): string[] {
  const lines = [
    `Campaign: ${campaign.name}`,
    `Type: ${campaign.campaignType}`,
    `Objective: ${campaign.objective ?? "Find qualified opportunities"}`,
    `Minimum opportunity score: ${campaign.minOpportunityScore}`,
    `Minimum confidence: ${campaign.minConfidenceScore}`,
    `Opportunities requested: ${campaign.opportunityCountRequested}`,
  ];

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
    lines.push(
      `Brand category: ${campaign.stormi.brandCategory ?? "—"}`,
      `Partnership type: ${campaign.stormi.desiredPartnershipType ?? "—"}`,
      `Geography: ${campaign.stormi.geographicPreference ?? "—"}`,
      campaign.stormi.brandExclusions?.length
        ? `Brand exclusions: ${campaign.stormi.brandExclusions.join("; ")}`
        : ""
    );
  }

  return lines.filter(Boolean);
}

export function buildEnrichContextLines(
  campaign: RevenueCampaign,
  candidate: { name: string; website?: string; city?: string; state?: string; industry?: string; whyInteresting?: string }
): string[] {
  return [
    ...buildCampaignContextLines(campaign),
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
    "Stormi is a creator partner for lifestyle/beauty brand collaborations.",
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
