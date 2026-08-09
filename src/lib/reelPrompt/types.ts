/** Video/reel prompt packs for external tools (OpenArt Director, Higgsfield, etc.). */

export type ReelPromptToolTarget = "openart" | "higgsfield" | "generic";

export type ReelPromptStyle = "cinematic_reel" | "ugc_ad" | "hybrid";

export type ReelPromptPlatform = "reels" | "tiktok" | "shorts" | "flexible";

export type ReelTalentKit = {
  id: string;
  name: string;
  /** Short continuity bible pasted into every clip prompt */
  continuity: string;
  appearance?: string;
  wardrobe?: string;
  voiceEnergy?: string;
  doNot?: string[];
};

export type ReelPromptClip = {
  id: string;
  /** 1-based order in the reel */
  index: number;
  /** Approx duration label, e.g. "2–3s" */
  duration: string;
  /** Hook / beat / CTA / etc. */
  beat: string;
  /** Scene number from script when applicable */
  sceneNumber?: string;
  /** Full paste-ready video prompt for the target tool */
  prompt: string;
  /** Optional spoken / VO line */
  dialogueOrVo?: string;
  /** On-screen text suggestion */
  onScreenText?: string;
  camera?: string;
  notes?: string;
};

export type ReelPromptPack = {
  title: string;
  style: ReelPromptStyle;
  toolTarget: ReelPromptToolTarget;
  platform: ReelPromptPlatform;
  /** Total length guidance, e.g. "15–20s" */
  targetLength: string;
  logline: string;
  /** Shared character/location continuity block */
  continuityBlock: string;
  /** Negative / avoid list for the tool */
  avoid: string[];
  clips: ReelPromptClip[];
  /** Single mega-prompt some tools prefer */
  masterPrompt?: string;
  /** How to use this pack in OpenArt / Higgsfield */
  finishInToolNotes: string[];
  talentKitId?: string | null;
  sourceSessionId?: string | null;
  createdAt: string;
};

export type ReelPromptGenerateInput = {
  style: ReelPromptStyle;
  toolTarget: ReelPromptToolTarget;
  platform: ReelPromptPlatform;
  /** Freeform idea when no script */
  idea?: string;
  /** Optional length hint */
  targetLength?: string;
  talentKitId?: string | null;
  /** Extra continuity overrides */
  talentNotes?: string;
  scriptTitle?: string;
  scenes?: Array<{
    sceneNumber: string;
    heading: string;
    action: string;
    dialogue: Array<{ character: string; line: string }>;
  }>;
  characters?: Array<{ name: string; role: string; description?: string }>;
  productionTone?: string;
};
