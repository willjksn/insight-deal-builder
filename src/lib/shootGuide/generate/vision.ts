import { callGeminiJsonWithHistory, type GeminiPart } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { guideContextBlock, sceneAnalysisBlock } from "@/lib/shootGuide/generate/context";
import { visionImageParts } from "@/lib/shootGuide/generate/media";
import { mockVisualIntelligenceJson } from "@/lib/shootGuide/generate/mock";
import {
  mergeVisualAnalysis,
  parseLightingPlan,
  parseLocationAnalysis,
  parsePlacementPlan,
  parseVisualAnalysis,
} from "@/lib/shootGuide/parse";
import { locationNotesFromAnalysis } from "@/lib/shootGuide/placement";
import type { ShootGuide, ShootGuidePatch, ShootGuideSetup } from "@/lib/shootGuide/types";

const JSON_OPTS = { temperature: 0.3, maxOutputTokens: 4096, thinkingBudget: 0 as const };

const SYSTEM = `You are a Director of Photography inside ShootSpine.
Analyze uploaded stills for what is possible in this room and how to light and place cameras.
Location photos determine what is possible. Mood/look stills determine what is desirable. Do not invent a different room than the location photo shows.
If a still is a storyboard or grid, read the WIDE / ESTABLISHING panel as the room. Ignore tight crops of screens, consoles, or product details when describing layout.
Do not return a lighting-plot diagram, coordinates, photoView, or topDown markers. Put camera and light placement in prose (setup + lightingPlan).

Return JSON only:
{
  "locationAnalysis": {
    "layout": string,
    "subjectPlacement": string,
    "practicals": string,
    "windows": string,
    "obstacles": string,
    "backgrounds": string,
    "clutter": string,
    "cameraZones": string,
    "lightZones": string,
    "cameraDirection": string,
    "geometry": string
  },
  "visualAnalysis": {
    "lightingDirection": string,
    "contrast": string,
    "colorTemperature": string,
    "composition": string,
    "depth": string,
    "lensCharacter": string,
    "cameraAngle": string,
    "palette": string,
    "energy": string
  },
  "setup": {
    "locationNotes": string,
    "cameraPlacement": string,
    "lightingNotes": string
  },
  "lightingPlan": {
    "cameraWb": string,
    "summary": string,
    "fixtures": [
      { "id": string, "fixture": string, "role": "key"|"fill"|"edge"|"accent"|"practical"|"negative", "placement": string, "height": string, "direction": string, "kelvin": string, "modifier": string }
    ]
  }
}`;

export interface ParsedVisualIntelligence {
  locationAnalysis: ReturnType<typeof parseLocationAnalysis>;
  visualAnalysis: ReturnType<typeof parseVisualAnalysis>;
  placementPlan: ReturnType<typeof parsePlacementPlan>;
  setup: Partial<ShootGuideSetup>;
  lightingPlan: ReturnType<typeof parseLightingPlan>;
}

export function parseVisualIntelligence(raw: unknown): ParsedVisualIntelligence {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const setup = o.setup && typeof o.setup === "object" ? (o.setup as Record<string, unknown>) : o;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    locationAnalysis: parseLocationAnalysis(o.locationAnalysis ?? o),
    visualAnalysis: parseVisualAnalysis(o.visualAnalysis ?? o),
    placementPlan: parsePlacementPlan(o.placementPlan ?? o),
    setup: {
      locationNotes: str(setup.locationNotes),
      cameraPlacement: str(setup.cameraPlacement),
      lightingNotes: str(setup.lightingNotes),
    },
    lightingPlan: parseLightingPlan(o.lightingPlan ?? { fixtures: [] }),
  };
}

export async function generateVisualIntelligence(
  guide: ShootGuide,
  extras?: { scriptExcerpt?: string; gearPromptBlock?: string }
): Promise<ParsedVisualIntelligence> {
  if (aiUsesMock()) {
    return parseVisualIntelligence(mockVisualIntelligenceJson(guide));
  }
  const { parts, used } = await visionImageParts(guide.references ?? []);
  const text = [
    used.length
      ? "Analyze the attached stills. Location / establishing frames = this room. Tighter crops are details. Mood/look stills = the intended grade. Do not describe a different gym or set."
      : "No stills attached. Infer location only from the prompt. Say in layout that this is inferred, not photographed.",
    "Write where talent stands, where the camera can go, and how to key/neg in prose. No diagrams or x/y markers.",
    sceneAnalysisBlock(guide.sceneAnalysis),
    guide.overview?.visualStrategy ? `Existing visual strategy:\n${guide.overview.visualStrategy}` : "",
    guide.setup?.lightingNotes ? `Existing lighting notes:\n${guide.setup.lightingNotes}` : "",
    guideContextBlock(guide, extras),
  ]
    .filter(Boolean)
    .join("\n\n");

  const userParts: GeminiPart[] = [{ text }, ...parts];
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [{ role: "user", parts: userParts }],
    JSON_OPTS
  );
  return parseVisualIntelligence(raw);
}

export function buildVisionPatch(
  guide: ShootGuide,
  parsed: ParsedVisualIntelligence
): ShootGuidePatch {
  const locationNotes =
    parsed.setup.locationNotes || locationNotesFromAnalysis(parsed.locationAnalysis);
  const cameraPlacement = parsed.setup.cameraPlacement || "";
  const lightingNotes = parsed.setup.lightingNotes || "";
  const setup: Partial<ShootGuideSetup> = {};
  if (locationNotes && (!guide.setup?.locationNotes || guide.setup.locationNotes.length < 40)) {
    setup.locationNotes = locationNotes;
  }
  if (cameraPlacement && (!guide.setup?.cameraPlacement || guide.setup.cameraPlacement.length < 40)) {
    setup.cameraPlacement = cameraPlacement;
  }
  if (lightingNotes && (!guide.setup?.lightingNotes || guide.setup.lightingNotes.length < 40)) {
    setup.lightingNotes = lightingNotes;
  }

  const lightingPlan =
    (guide.lightingPlan?.fixtures?.length ?? 0) > 0
      ? guide.lightingPlan
      : parsed.lightingPlan.fixtures.length
        ? parsed.lightingPlan
        : guide.lightingPlan;

  return {
    locationAnalysis: parsed.locationAnalysis,
    visualAnalysis: mergeVisualAnalysis(guide.visualAnalysis, parsed.visualAnalysis),
    placementPlan: null,
    lightingPlan,
    ...(Object.keys(setup).length ? { setup } : {}),
  };
}
