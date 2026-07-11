import { Firestore } from "firebase-admin/firestore";
import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { BRAND_PROFILES_COLLECTION } from "@/lib/contentIdeas/collections";
import { IDEA_ENGINE_SYSTEM } from "@/lib/contentIdeas/ideaEnginePrompt";
import { parseIdeaEngineResponse } from "@/lib/contentIdeas/parseIdeas";
import {
  formatBrandProfileForPrompt,
  formatIdeaInputsForPrompt,
} from "@/lib/contentIdeas/profilePrompt";
import {
  formatWeeklyTrendsForIdeaPrompt,
  resolveWeeklyTrendsForIdeas,
} from "@/lib/contentIdeas/trendsForIdeas";
import {
  BrandProfile,
  ContentIdea,
  IdeaGenerationInputs,
  IdeaGenerationSession,
} from "@/lib/contentIdeas/types";
import { flattenShootingKit, normalizeShootingKit } from "@/lib/production/shootingKit";
import { PRODUCTION_BOARDS_COLLECTION } from "@/lib/firebase/productionFirestore";
import { ProductionBoard } from "@/lib/production/types";

async function loadProfile(db: Firestore, profileId: string, userId: string): Promise<BrandProfile | null> {
  const snap = await db.collection(BRAND_PROFILES_COLLECTION).doc(profileId).get();
  if (!snap.exists) return null;
  const data = snap.data() as BrandProfile;
  if (data.userId !== userId) return null;
  return { ...data, id: snap.id };
}

async function loadUserKitNotes(db: Firestore, userId: string): Promise<string> {
  const q = await db
    .collection(PRODUCTION_BOARDS_COLLECTION)
    .where("userId", "==", userId)
    .limit(1)
    .get();
  if (q.empty) return "";
  const board = q.docs[0].data() as ProductionBoard;
  const kit = normalizeShootingKit(board.shootingKit);
  const lines = flattenShootingKit(kit);
  return lines.length ? lines.join("\n") : (board.gearItems ?? []).join("\n");
}

function mockIdeas(inputs: IdeaGenerationInputs): ReturnType<typeof parseIdeaEngineResponse> {
  const count = Math.min(inputs.ideaCount, 7);
  const ideas: ContentIdea[] = Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    title: `Concept ${i + 1}: ${inputs.roughIdea.slice(0, 40) || "Weekly content"}`,
    hook: inputs.roughIdea.slice(0, 120) || "A cinematic hook tailored to your profile.",
    summary: `Filmable idea ${i + 1} aligned with ${inputs.goals[0] ?? "awareness"} on ${inputs.platforms[0] ?? "Reels"}.`,
    primaryGoal: inputs.goals[0],
    recommendedPlatform: inputs.platforms[0],
    recommendedFormat: inputs.contentFormats[0],
    productionDifficulty: inputs.productionDifficulty ?? "moderate",
    estimatedShootTime: inputs.timeAvailable ?? "half-day",
    readiness: "needs development",
    status: "new",
    saved: true,
    score: {
      brandFit: 8,
      audienceFit: 7,
      originality: 7,
      visualPotential: 8,
      businessValue: 7,
      engagementPotential: 8,
      conversionPotential: 6,
      productionFeasibility: 8,
      repurposingValue: 7,
      portfolioValue: 8,
      overall: 7,
    },
  }));
  return {
    campaignSummary: inputs.campaignName ?? inputs.weeklyTheme ?? "Weekly content mix",
    recommendedStrategy: "Balance hero cinematic content with practical social cutdowns.",
    ideas,
    weeklySchedule: ideas.map((idea, i) => ({
      day: `Day ${i + 1}`,
      title: idea.title,
      hook: idea.hook,
      summary: idea.summary,
      ideaId: idea.id,
    })),
  };
}

export async function generateContentIdeas(params: {
  db: Firestore;
  userId: string;
  inputs: IdeaGenerationInputs;
  profileId?: string;
}): Promise<
  Pick<
    IdeaGenerationSession,
    | "ideas"
    | "weeklySchedule"
    | "campaignSummary"
    | "recommendedStrategy"
    | "questions"
    | "warnings"
    | "trendsResearch"
    | "trendsContentType"
  >
> {
  const { db, userId, inputs, profileId } = params;

  const profile = profileId ? await loadProfile(db, profileId, userId) : null;
  const { research, contentType } = await resolveWeeklyTrendsForIdeas(
    db,
    inputs.contentFormats,
    inputs.platforms
  );

  if (aiUsesMock()) {
    const mock = mockIdeas(inputs);
    return { ...mock, trendsResearch: research, trendsContentType: contentType };
  }

  const kitLines = await loadUserKitNotes(db, userId);
  const equipmentBlock = kitLines
    ? `=== AVAILABLE PRODUCTION GEAR (use only this inventory when planning) ===\n${kitLines}`
    : "=== PRODUCTION GEAR ===\nUse realistic small-crew cinema gear unless user listed resources.";

  const prompt = [
    profile ? formatBrandProfileForPrompt(profile) : "No profile selected — infer carefully from rough idea.",
    formatIdeaInputsForPrompt(inputs),
    formatWeeklyTrendsForIdeaPrompt(research),
    equipmentBlock,
    inputs.productionResources ? `User-listed resources this week:\n${inputs.productionResources}` : "",
    "",
    `Generate exactly ${inputs.ideaCount} distinct ideas.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = await callGeminiJsonText(IDEA_ENGINE_SYSTEM, prompt);
  const parsed = parseIdeaEngineResponse(raw);

  return {
    ...parsed,
    trendsResearch: research,
    trendsContentType: contentType,
  };
}

export function ideaToConceptDocument(idea: ContentIdea, profile?: BrandProfile | null): string {
  const parts = [
    `# ${idea.title}`,
    "",
    idea.hook,
    "",
    idea.summary,
    "",
    idea.creative?.coreIdea ? `Core idea: ${idea.creative.coreIdea}` : "",
    idea.creative?.storyStructure ? `Structure: ${idea.creative.storyStructure}` : "",
    idea.creative?.visualStyle ? `Visual: ${idea.creative.visualStyle}` : "",
    idea.production?.recommendedLocation ? `Location: ${idea.production.recommendedLocation}` : "",
    idea.production?.cameraApproach ? `Camera: ${idea.production.cameraApproach}` : "",
    idea.production?.lightingConcept ? `Lighting: ${idea.production.lightingConcept}` : "",
    idea.production?.audioApproach ? `Audio: ${idea.production.audioApproach}` : "",
    idea.deliverables?.heroVideo ? `Deliverables: ${idea.deliverables.heroVideo}` : "",
    profile?.basic.businessOrCreatorName ? `Client/Creator: ${profile.basic.businessOrCreatorName}` : "",
  ];
  return parts.filter(Boolean).join("\n");
}
