import {
  ScoutAppMode,
  ScoutAspectRatio,
  ScoutColorGradingPref,
  ScoutMood,
  ScoutPlatform,
  ScoutPreferredLook,
  ScoutProject,
  ScoutSceneType,
  ScoutSkillLevel,
} from "@/lib/scout/types";

export type ScoutSessionFormValues = {
  projectName: string;
  sceneType: ScoutSceneType;
  sceneIdea: string;
  mood: ScoutMood;
  theme: string;
  platform: ScoutPlatform;
  aspectRatio: ScoutAspectRatio;
  skillLevel: ScoutSkillLevel;
  preferredLook: ScoutPreferredLook;
  selectedGearProfileId: string;
  cameraBody: string;
  lensOptions: string;
  lightingGear: string;
  audioGear: string;
  stabilizationGear: string;
  appMode: ScoutAppMode;
  crewSize: string;
  timeOfDay: string;
  colorGradingPreference: ScoutColorGradingPref;
};

export const DEFAULT_SCOUT_SESSION_FORM: ScoutSessionFormValues = {
  projectName: "",
  sceneType: "creator_reel",
  sceneIdea: "",
  mood: "natural",
  theme: "",
  platform: "instagram_reels",
  aspectRatio: "9:16",
  skillLevel: "beginner",
  preferredLook: "s_cinetone",
  selectedGearProfileId: "",
  cameraBody: "",
  lensOptions: "",
  lightingGear: "",
  audioGear: "",
  stabilizationGear: "",
  appMode: "quick",
  crewSize: "1",
  timeOfDay: "day",
  colorGradingPreference: "minimal",
};

export function scoutProjectToFormValues(project: ScoutProject): ScoutSessionFormValues {
  return {
    projectName: project.projectName,
    sceneType: project.sceneType,
    sceneIdea: project.sceneIdea,
    mood: project.mood,
    theme: project.theme ?? "",
    platform: project.platform,
    aspectRatio: project.aspectRatio,
    skillLevel: project.skillLevel,
    preferredLook: project.preferredLook,
    selectedGearProfileId: project.selectedGearProfileId ?? "",
    cameraBody: project.cameraBody ?? DEFAULT_SCOUT_SESSION_FORM.cameraBody,
    lensOptions: project.lensOptions ?? DEFAULT_SCOUT_SESSION_FORM.lensOptions,
    lightingGear: project.lightingGear ?? DEFAULT_SCOUT_SESSION_FORM.lightingGear,
    audioGear: project.audioGear ?? DEFAULT_SCOUT_SESSION_FORM.audioGear,
    stabilizationGear: project.stabilizationGear ?? DEFAULT_SCOUT_SESSION_FORM.stabilizationGear,
    appMode: project.appMode ?? "quick",
    crewSize: project.crewSize != null ? String(project.crewSize) : "1",
    timeOfDay: project.timeOfDay ?? "day",
    colorGradingPreference: project.colorGradingPreference ?? "minimal",
  };
}

export function formValuesToScoutProjectFields(
  form: ScoutSessionFormValues,
  linkedProjectId: string,
  linkedProjectName?: string
): Pick<
  ScoutProject,
  | "projectName"
  | "sceneType"
  | "sceneIdea"
  | "mood"
  | "theme"
  | "platform"
  | "aspectRatio"
  | "skillLevel"
  | "preferredLook"
  | "cameraBody"
  | "lensOptions"
  | "lightingGear"
  | "audioGear"
  | "stabilizationGear"
  | "appMode"
  | "timeOfDay"
  | "colorGradingPreference"
> & {
  linkedProjectId?: string;
  linkedProjectName?: string;
  selectedGearProfileId?: string;
  crewSize?: number;
} {
  return {
    linkedProjectId: linkedProjectId || undefined,
    linkedProjectName: linkedProjectName || undefined,
    projectName: form.projectName.trim(),
    sceneType: form.sceneType,
    sceneIdea: form.sceneIdea.trim(),
    mood: form.mood,
    theme: form.theme.trim() || form.mood,
    platform: form.platform,
    aspectRatio: form.aspectRatio,
    skillLevel: form.skillLevel,
    preferredLook: form.preferredLook,
    selectedGearProfileId: form.selectedGearProfileId || undefined,
    cameraBody: form.cameraBody,
    lensOptions: form.lensOptions,
    lightingGear: form.lightingGear,
    audioGear: form.audioGear,
    stabilizationGear: form.stabilizationGear,
    appMode: form.appMode,
    crewSize: form.crewSize ? Number(form.crewSize) : undefined,
    timeOfDay: form.timeOfDay,
    colorGradingPreference: form.colorGradingPreference,
  };
}

export function scoutSessionHasDownstreamArtifacts(project: ScoutProject): boolean {
  return Boolean(
    project.latestAnalysis ||
      project.latestDpPlan ||
      project.latestShotList ||
      (project.latestPreviews?.length ?? 0) > 0
  );
}
