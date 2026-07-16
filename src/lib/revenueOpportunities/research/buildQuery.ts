import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";

export function buildImgResearchQuery(campaign: RevenueCampaign): string {
  const img = campaign.img;
  const year = new Date().getFullYear();
  const location = [img?.city, img?.state].filter(Boolean).join(", ") || "Orlando, FL";
  const industry = img?.industry ?? "local businesses";
  const radius = img?.radiusMiles ?? 35;
  return [
    `${industry} ${location}`,
    `within ${radius} miles`,
    "marketing social media video content",
    "hotel restaurant med spa boutique",
    `business expansion renovation ${year}`,
    "cinematic brand content opportunity",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildStormiResearchQuery(campaign: RevenueCampaign): string {
  const stormi = campaign.stormi;
  const year = new Date().getFullYear();
  const category = stormi?.brandCategory ?? "beauty lifestyle brands";
  const geo = stormi?.geographicPreference ?? "United States";
  return [
    category,
    geo,
    "creator partnership influencer marketing",
    "brand collaboration campaign",
    stormi?.productType,
    stormi?.desiredPartnershipType,
    ` ${year}`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildCampaignContextLines(campaign: RevenueCampaign): string[] {
  const lines = [
    `Campaign: ${campaign.name}`,
    `Type: ${campaign.campaignType}`,
    `Objective: ${campaign.objective ?? "Find qualified opportunities"}`,
    `Minimum opportunity score: ${campaign.minOpportunityScore}`,
    `Opportunities requested: ${campaign.opportunityCountRequested}`,
  ];
  if (campaign.img) {
    lines.push(
      `Industry: ${campaign.img.industry ?? "—"}`,
      `Location: ${campaign.img.city ?? ""}, ${campaign.img.state ?? ""} (${campaign.img.radiusMiles ?? 35} mi)`,
      `Service to promote: ${campaign.img.serviceToPromote ?? "Business Brand Package"}`
    );
  }
  if (campaign.stormi) {
    lines.push(
      `Brand category: ${campaign.stormi.brandCategory ?? "—"}`,
      `Partnership type: ${campaign.stormi.desiredPartnershipType ?? "—"}`,
      `Geography: ${campaign.stormi.geographicPreference ?? "—"}`
    );
  }
  return lines;
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
