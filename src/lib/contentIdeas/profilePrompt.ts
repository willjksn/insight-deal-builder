import { BrandProfile, IdeaGenerationInputs } from "@/lib/contentIdeas/types";

export function formatBrandProfileForPrompt(profile: BrandProfile): string {
  const lines: string[] = [
    `=== BRAND / CREATOR PROFILE (${profile.type}) ===`,
    `Name: ${profile.basic.profileName}`,
  ];
  if (profile.basic.businessOrCreatorName) lines.push(`Entity: ${profile.basic.businessOrCreatorName}`);
  if (profile.basic.industry) lines.push(`Industry: ${profile.basic.industry}`);
  if (profile.basic.location) lines.push(`Location: ${profile.basic.location}`);
  if (profile.basic.socialHandles) lines.push(`Social: ${profile.basic.socialHandles}`);
  if (profile.basic.notes) lines.push(`Notes: ${profile.basic.notes}`);

  const bi = profile.brandIdentity;
  if (bi) {
    lines.push("", "Brand identity:");
    if (bi.description) lines.push(`- ${bi.description}`);
    if (bi.voice) lines.push(`- Voice: ${bi.voice}`);
    if (bi.personality) lines.push(`- Personality: ${bi.personality}`);
    if (bi.visualIdentity) lines.push(`- Visual: ${bi.visualIdentity}`);
    if (bi.brandWords) lines.push(`- Brand words: ${bi.brandWords}`);
    if (bi.avoidWords) lines.push(`- Avoid: ${bi.avoidWords}`);
  }

  const ci = profile.creatorIdentity;
  if (ci) {
    lines.push("", "Creator:");
    if (ci.creatorName) lines.push(`- ${ci.creatorName}`);
    if (ci.niche) lines.push(`- Niche: ${ci.niche}`);
    if (ci.onCameraStyle) lines.push(`- On camera: ${ci.onCameraStyle}`);
    if (ci.topicsEnjoy) lines.push(`- Topics enjoy: ${ci.topicsEnjoy}`);
    if (ci.topicsAvoid) lines.push(`- Topics avoid: ${ci.topicsAvoid}`);
    if (ci.comfortBoundaries) lines.push(`- Boundaries: ${ci.comfortBoundaries}`);
  }

  const aud = profile.audience;
  if (aud) {
    lines.push("", "Audience:");
    if (aud.primaryAudience) lines.push(`- Primary: ${aud.primaryAudience}`);
    if (aud.ageRange) lines.push(`- Age: ${aud.ageRange}`);
    if (aud.painPoints) lines.push(`- Pain points: ${aud.painPoints}`);
    if (aud.desiredEmotionalResponse) lines.push(`- Desired feeling: ${aud.desiredEmotionalResponse}`);
  }

  const biz = profile.business;
  if (biz) {
    lines.push("", "Business:");
    if (biz.uniqueSellingProposition) lines.push(`- USP: ${biz.uniqueSellingProposition}`);
    if (biz.products) lines.push(`- Products: ${biz.products}`);
    if (biz.services) lines.push(`- Services: ${biz.services}`);
    if (biz.primaryConversionGoal) lines.push(`- Conversion goal: ${biz.primaryConversionGoal}`);
  }

  const prod = profile.productionPreferences;
  if (prod) {
    lines.push("", "Production preferences:");
    if (prod.visualStyle) lines.push(`- Visual: ${prod.visualStyle}`);
    if (prod.lightingStyle) lines.push(`- Lighting: ${prod.lightingStyle}`);
    if (prod.preferredPlatforms?.length) lines.push(`- Platforms: ${prod.preferredPlatforms.join(", ")}`);
    if (prod.equipmentNotes) lines.push(`- Equipment: ${prod.equipmentNotes}`);
    if (prod.brandRestrictions) lines.push(`- Restrictions: ${prod.brandRestrictions}`);
  }

  const safety = profile.safety;
  if (safety) {
    lines.push("", "Compliance / safety (MUST respect):");
    if (safety.prohibitedTopics) lines.push(`- Prohibited: ${safety.prohibitedTopics}`);
    if (safety.contentBoundaries) lines.push(`- Boundaries: ${safety.contentBoundaries}`);
    if (safety.complianceRules) lines.push(`- Rules: ${safety.complianceRules}`);
    if (safety.requiredDisclaimers) lines.push(`- Disclaimers: ${safety.requiredDisclaimers}`);
  }

  return lines.join("\n");
}

export function formatIdeaInputsForPrompt(inputs: IdeaGenerationInputs): string {
  const lines = [
    "=== IDEA GENERATION REQUEST ===",
    `Rough idea / direction: ${inputs.roughIdea}`,
    `Goals: ${inputs.goals.join(", ") || "not specified"}`,
    `Platforms: ${inputs.platforms.join(", ") || "not specified"}`,
    `Formats: ${inputs.contentFormats.join(", ") || "not specified"}`,
    `Number of ideas: ${inputs.ideaCount}`,
    `Look: ${inputs.lookTags.join(", ")}${inputs.lookNotes ? ` — ${inputs.lookNotes}` : ""}`,
    `Tone: ${inputs.toneTags.join(", ")}`,
  ];
  if (inputs.campaignName) lines.push(`Campaign: ${inputs.campaignName}`);
  if (inputs.weeklyTheme) lines.push(`Weekly theme: ${inputs.weeklyTheme}`);
  if (inputs.featuredOffer) lines.push(`Featured offer: ${inputs.featuredOffer}`);
  if (inputs.callToAction) lines.push(`CTA: ${inputs.callToAction}`);
  if (inputs.productionResources) lines.push(`Resources: ${inputs.productionResources}`);
  if (inputs.constraints?.length) lines.push(`Constraints: ${inputs.constraints.join("; ")}`);
  if (inputs.creativeIntensity) lines.push(`Creative intensity: ${inputs.creativeIntensity}`);
  if (inputs.productionDifficulty) lines.push(`Difficulty cap: ${inputs.productionDifficulty}`);
  if (inputs.timeAvailable) lines.push(`Time available: ${inputs.timeAvailable}`);
  if (inputs.deliverableGoals?.length) lines.push(`Deliverables: ${inputs.deliverableGoals.join(", ")}`);
  return lines.join("\n");
}
