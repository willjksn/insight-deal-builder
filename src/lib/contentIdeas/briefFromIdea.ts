import { ScriptWriterBrief, ScriptContentType, ScriptMood } from "@/lib/scriptWriter/brief";
import { resolveTrendContentType } from "@/lib/contentIdeas/trendsForIdeas";
import { BrandProfile, ContentIdea, IdeaGenerationInputs } from "@/lib/contentIdeas/types";

function mapMood(toneTags: string[] = [], lookTags: string[] = []): ScriptMood {
  const hay = [...toneTags, ...lookTags].join(" ").toLowerCase();
  if (hay.includes("horror") || hay.includes("scary")) return "horror";
  if (hay.includes("moody") || hay.includes("dark")) return "moody_cinematic";
  if (hay.includes("luxury") || hay.includes("premium")) return "dramatic";
  if (hay.includes("funny") || hay.includes("playful")) return "comedy";
  if (hay.includes("documentary")) return "documentary_verite";
  if (hay.includes("romantic")) return "romantic";
  if (hay.includes("energetic")) return "high_energy";
  if (hay.includes("inspir")) return "inspirational";
  return "warm_natural";
}

function mapRuntime(idea: ContentIdea, inputs: IdeaGenerationInputs): ScriptWriterBrief["runtime"] {
  const len = (idea.estimatedLength ?? inputs.timeAvailable ?? "").toLowerCase();
  if (len.includes("15") || len.includes("30 sec")) return "30s";
  if (len.includes("60") || len.includes("1 min")) return "60s";
  if (len.includes("90")) return "90s";
  if (len.includes("2") || len.includes("3 min")) return "2_3min";
  if (len.includes("5") || len.includes("10")) return "5_10min";
  return "60s";
}

export function briefFromIdeaAndProfile(
  idea: ContentIdea,
  inputs: IdeaGenerationInputs,
  profile?: BrandProfile | null
): ScriptWriterBrief {
  const contentType: ScriptContentType = resolveTrendContentType(
    inputs.contentFormats.length ? inputs.contentFormats : [idea.recommendedFormat ?? "social_reel"],
    inputs.platforms
  );

  const conceptParts = [
    idea.title,
    idea.hook,
    idea.summary,
    idea.creative?.coreIdea,
    idea.creative?.storyStructure,
    idea.creative?.visualStyle,
    idea.production?.recommendedLocation ? `Location: ${idea.production.recommendedLocation}` : "",
    inputs.roughIdea,
  ].filter(Boolean);

  return {
    contentType,
    mood: mapMood(inputs.toneTags, inputs.lookTags),
    castSize: "small_group",
    runtime: mapRuntime(idea, inputs),
    audienceAge: "18_34",
    genderMix: "any",
    concept: conceptParts.join("\n\n"),
    characterNotes: profile?.creatorIdentity?.creatorName
      ? `On-camera: ${profile.creatorIdentity.creatorName}. ${profile.creatorIdentity.onCameraStyle ?? ""}`
      : profile?.basic.businessOrCreatorName,
  };
}
