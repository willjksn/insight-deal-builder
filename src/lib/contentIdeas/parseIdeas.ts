import {
  ContentIdea,
  IdeaGenerationSession,
  IdeaScore,
  WeeklyScheduleDay,
} from "@/lib/contentIdeas/types";

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) out[key] = val;
  }
  return out as T;
}

function num(v: unknown, min = 1, max = 10): number {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseScore(raw: unknown): IdeaScore | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;
  const scores = {
    brandFit: num(s.brandFit),
    audienceFit: num(s.audienceFit),
    originality: num(s.originality),
    visualPotential: num(s.visualPotential),
    businessValue: num(s.businessValue),
    engagementPotential: num(s.engagementPotential),
    conversionPotential: num(s.conversionPotential),
    productionFeasibility: num(s.productionFeasibility),
    repurposingValue: num(s.repurposingValue),
    portfolioValue: num(s.portfolioValue),
  };
  const overall =
    typeof s.overall === "number" && !Number.isNaN(s.overall)
      ? num(s.overall)
      : Math.round(
          (scores.brandFit +
            scores.audienceFit +
            scores.originality +
            scores.visualPotential +
            scores.businessValue +
            scores.engagementPotential +
            scores.conversionPotential +
            scores.productionFeasibility +
            scores.repurposingValue +
            scores.portfolioValue) /
            10
        );
  return {
    ...scores,
    overall,
    ...(str(s.explanations) ? { explanations: str(s.explanations) } : {}),
  };
}

function parseNested<T extends Record<string, unknown>>(
  raw: unknown,
  keys: (keyof T)[]
): Partial<T> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const v = str(src[key as string]);
    if (v) out[key as string] = v;
  }
  return Object.keys(out).length ? (out as Partial<T>) : undefined;
}

export function parseContentIdea(raw: unknown, index: number): ContentIdea | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const title = str(d.title);
  const hook = str(d.hook);
  const summary = str(d.summary);
  if (!title || !hook || !summary) return null;

  return omitUndefined({
    id: str(d.id) || crypto.randomUUID(),
    title,
    hook,
    summary,
    primaryGoal: str(d.primaryGoal),
    targetAudience: str(d.targetAudience),
    recommendedPlatform: str(d.recommendedPlatform),
    recommendedFormat: str(d.recommendedFormat),
    estimatedLength: str(d.estimatedLength),
    productionDifficulty: str(d.productionDifficulty),
    estimatedShootTime: str(d.estimatedShootTime),
    estimatedEditTime: str(d.estimatedEditTime),
    estimatedCostLevel: str(d.estimatedCostLevel),
    creative: parseNested(d.creative, [
      "coreIdea",
      "storyStructure",
      "openingHook",
      "middleDevelopment",
      "endingPayoff",
      "callToAction",
      "tone",
      "emotionalTarget",
      "visualStyle",
      "colorLighting",
      "cameraMovement",
      "editingRhythm",
      "musicDirection",
      "soundDesign",
    ]),
    production: parseNested(d.production, [
      "recommendedLocation",
      "requiredTalent",
      "wardrobe",
      "props",
      "productionDesign",
      "cameraApproach",
      "suggestedLenses",
      "lightingConcept",
      "audioApproach",
      "requiredCrew",
      "specialEquipment",
      "challenges",
      "simplifiedAlternative",
    ]),
    deliverables: parseNested(d.deliverables, [
      "heroVideo",
      "reelCutdowns",
      "stories",
      "stills",
      "behindTheScenes",
      "teaser",
      "thumbnail",
      "captionDirection",
      "repurposing",
    ]),
    strategy: parseNested(d.strategy, [
      "whyFitsBrand",
      "whyAudienceResponds",
      "businessGoalSupport",
      "visualDifferentiator",
      "repurposingOpportunities",
      "risks",
    ]),
    readiness: str(d.readiness),
    score: parseScore(d.score),
    imagePrompt: str(d.imagePrompt),
    status: "new",
    saved: true,
    favorite: false,
  }) as ContentIdea;
}

function parseWeeklyScheduleRow(row: unknown): WeeklyScheduleDay | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const day = str(r.day);
  const title = str(r.title);
  if (!day || !title) return null;
  return omitUndefined({
    day,
    title,
    contentType: str(r.contentType),
    platform: str(r.platform),
    goal: str(r.goal),
    hook: str(r.hook),
    summary: str(r.summary),
    productionRequirement: str(r.productionRequirement),
    postingPurpose: str(r.postingPurpose),
    campaignRelation: str(r.campaignRelation),
    ideaId: str(r.ideaId),
  }) as WeeklyScheduleDay;
}

export function parseIdeaEngineResponse(raw: unknown): Pick<
  IdeaGenerationSession,
  "ideas" | "weeklySchedule" | "campaignSummary" | "recommendedStrategy" | "questions" | "warnings"
> {
  const data = (raw ?? {}) as Record<string, unknown>;
  const ideasRaw = Array.isArray(data.ideas) ? data.ideas : [];
  const ideas = ideasRaw
    .map((item, i) => parseContentIdea(item, i))
    .filter((x): x is ContentIdea => x !== null);

  if (!ideas.length) {
    throw new Error("Idea generation returned no valid ideas");
  }

  const weeklySchedule: WeeklyScheduleDay[] = Array.isArray(data.weeklySchedule)
    ? data.weeklySchedule
        .map(parseWeeklyScheduleRow)
        .filter((x): x is WeeklyScheduleDay => x !== null)
    : [];

  return omitUndefined({
    campaignSummary: str(data.campaignSummary),
    recommendedStrategy: str(data.recommendedStrategy),
    ideas,
    weeklySchedule: weeklySchedule.length ? weeklySchedule : undefined,
    questions: Array.isArray(data.questions)
      ? data.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      : undefined,
    warnings: Array.isArray(data.warnings)
      ? data.warnings.filter((w): w is string => typeof w === "string" && w.trim().length > 0)
      : undefined,
  }) as Pick<
    IdeaGenerationSession,
    "ideas" | "weeklySchedule" | "campaignSummary" | "recommendedStrategy" | "questions" | "warnings"
  >;
}
