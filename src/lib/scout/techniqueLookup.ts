import { MOOD_LABEL, SCENE_TYPE_LABEL } from "@/lib/scout/constants";
import { summarizeWebResearch } from "@/lib/search/researchSummarize";
import { tavilySearch } from "@/lib/search/tavilyClient";
import { ScoutProject, ScoutTechniqueLookup } from "@/lib/scout/types";

const TECHNIQUE_SYSTEM = `You are a director of photography coach. Given web search results, return JSON only:
{
  "summary": "2-4 sentences of actionable technique advice for this exact setup",
  "techniques": ["specific shooting / lighting techniques — max 6"],
  "gearTips": ["gear-specific tips using the user's listed gear when possible — max 5"],
  "commonMistakes": ["mistakes to avoid on set — max 4"],
  "sourceTitles": ["source titles from the research"]
}`;

function buildTechniqueQuery(project: ScoutProject, userQuery?: string): string {
  if (userQuery?.trim()) {
    return userQuery.trim();
  }

  const scene = SCENE_TYPE_LABEL[project.sceneType] ?? project.sceneType;
  const mood = MOOD_LABEL[project.mood] ?? project.mood;
  const camera = project.cameraBody ?? "cinema camera";
  const year = new Date().getFullYear();

  return [
    `how to shoot ${scene}`,
    `${mood} lighting`,
    `${camera}`,
    project.lightingGear ? project.lightingGear.slice(0, 60) : "",
    `${project.aspectRatio} ${project.platform.replace(/_/g, " ")}`,
    `DP techniques ${year}`,
  ]
    .filter(Boolean)
    .join(" ");
}

function projectContext(project: ScoutProject): string {
  const dp = project.latestDpPlan;
  const lines = [
    `Session: ${project.projectName}`,
    `Scene: ${SCENE_TYPE_LABEL[project.sceneType] ?? project.sceneType}`,
    `Mood: ${MOOD_LABEL[project.mood] ?? project.mood}`,
    `Platform: ${project.platform.replace(/_/g, " ")} · ${project.aspectRatio}`,
    `Camera: ${project.cameraBody ?? "not specified"}`,
    `Lenses: ${project.lensOptions ?? "not specified"}`,
    `Lighting gear: ${project.lightingGear ?? "not specified"}`,
    `Audio: ${project.audioGear ?? "not specified"}`,
  ];
  if (dp?.bestAngle) lines.push(`Best angle: ${dp.bestAngle}`);
  if (dp?.cameraSettings.lensRecommendation) {
    lines.push(`Recommended lens: ${dp.cameraSettings.lensRecommendation}`);
  }
  if (dp?.lightingPlan.lightingMotivation) {
    lines.push(`Lighting motivation: ${dp.lightingPlan.lightingMotivation}`);
  }
  return lines.join("\n");
}

export async function lookupScoutTechniques(
  project: ScoutProject,
  userQuery?: string
): Promise<ScoutTechniqueLookup> {
  const query = buildTechniqueQuery(project, userQuery);
  const search = await tavilySearch(query, {
    maxResults: 6,
    searchDepth: "basic",
    includeAnswer: true,
  });

  const raw = await summarizeWebResearch<Partial<ScoutTechniqueLookup>>(TECHNIQUE_SYSTEM, search, [
    "Scout session context:",
    projectContext(project),
    userQuery?.trim() ? `\nUser question: ${userQuery.trim()}` : "",
  ]);

  return {
    query,
    provider: "tavily",
    searchedAt: new Date().toISOString(),
    summary: raw.summary?.trim() || "Technique research complete.",
    techniques: Array.isArray(raw.techniques)
      ? raw.techniques.filter((t): t is string => typeof t === "string").slice(0, 6)
      : [],
    gearTips: Array.isArray(raw.gearTips)
      ? raw.gearTips.filter((t): t is string => typeof t === "string").slice(0, 5)
      : [],
    commonMistakes: Array.isArray(raw.commonMistakes)
      ? raw.commonMistakes.filter((t): t is string => typeof t === "string").slice(0, 4)
      : [],
    sourceTitles: Array.isArray(raw.sourceTitles)
      ? raw.sourceTitles.filter((t): t is string => typeof t === "string").slice(0, 6)
      : search.results.map((r) => r.title).slice(0, 6),
  };
}
