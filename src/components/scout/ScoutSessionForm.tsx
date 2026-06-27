"use client";

import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ScoutCard } from "@/components/scout/ScoutShell";
import { ScoutProjectLinkSelect } from "@/components/scout/ScoutProjectLinkSelect";
import {
  SCOUT_APP_MODES,
  SCOUT_COLOR_GRADING_PREFS,
  SCOUT_ASPECT_RATIOS,
  SCOUT_MOODS,
  SCOUT_PLATFORMS,
  SCOUT_PREFERRED_LOOKS,
  SCOUT_SCENE_TYPES,
  SCOUT_SKILL_LEVELS,
} from "@/lib/scout/constants";
import {
  ScoutAspectRatio,
  ScoutMood,
  ScoutPlatform,
  ScoutPreferredLook,
  ScoutSceneType,
  ScoutSkillLevel,
  ScoutGearProfile,
  ScoutAppMode,
  ScoutColorGradingPref,
} from "@/lib/scout/types";
import { ScoutSessionFormValues } from "@/lib/scout/sessionForm";
import { Project } from "@/lib/types";
import { projectLocationHint, projectsForScoutLinkDisplay } from "@/lib/utils/scoutProjectLink";

type Props = {
  form: ScoutSessionFormValues;
  onChange: (next: ScoutSessionFormValues) => void;
  linkedProjectId: string;
  onLinkedProjectChange: (projectId: string) => void;
  projects: Project[];
  canLinkProjects: boolean;
  gearProfiles: ScoutGearProfile[];
  linkedProject?: Project;
};

export function ScoutSessionForm({
  form,
  onChange,
  linkedProjectId,
  onLinkedProjectChange,
  projects,
  canLinkProjects,
  gearProfiles,
  linkedProject,
}: Props) {
  const set = <K extends keyof ScoutSessionFormValues>(key: K, value: ScoutSessionFormValues[K]) => {
    onChange({ ...form, [key]: value });
  };

  const applyGearProfile = (id: string) => {
    const profile = gearProfiles.find((g) => g.id === id);
    if (!profile) return;
    onChange({
      ...form,
      selectedGearProfileId: id,
      cameraBody: profile.cameraBodies.join(", ") || form.cameraBody,
      lensOptions: profile.lenses.join(", ") || form.lensOptions,
      lightingGear: profile.lights.join(", ") || form.lightingGear,
      audioGear: profile.audio.join(", ") || form.audioGear,
      stabilizationGear: profile.stabilizers.join(", ") || form.stabilizationGear,
    });
  };

  return (
    <div className="space-y-6">
      {canLinkProjects && projectsForScoutLinkDisplay(projects).length > 0 && (
        <ScoutCard>
          <ScoutProjectLinkSelect
            projects={projects}
            value={linkedProjectId}
            onChange={onLinkedProjectChange}
          />
        </ScoutCard>
      )}

      {canLinkProjects && projects.length === 0 && (
        <ScoutCard className="text-sm text-slate-600">
          <Link href="/projects" className="text-sky-600 hover:underline">
            Create a project
          </Link>{" "}
          to link this scout to a job.
        </ScoutCard>
      )}

      <ScoutCard className="space-y-4">
        <Input
          label="Session name"
          value={form.projectName}
          onChange={(e) => set("projectName", e.target.value)}
          touch
        />
        <Select
          label="Scene type"
          value={form.sceneType}
          onChange={(e) => set("sceneType", e.target.value as ScoutSceneType)}
          options={SCOUT_SCENE_TYPES}
          touch
        />
        <Textarea
          label="Scene idea"
          value={form.sceneIdea}
          onChange={(e) => set("sceneIdea", e.target.value)}
          placeholder={
            linkedProject
              ? projectLocationHint(linkedProject) ??
                "What happens in this scene? Who is on camera?"
              : "What happens in this scene? Who is on camera?"
          }
          className="min-h-[88px]"
          touch
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Mood"
            value={form.mood}
            onChange={(e) => set("mood", e.target.value as ScoutMood)}
            options={SCOUT_MOODS}
            touch
          />
          <Input
            label="Theme"
            value={form.theme}
            onChange={(e) => set("theme", e.target.value)}
            placeholder="e.g. quiet morning tension"
            touch
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Platform"
            value={form.platform}
            onChange={(e) => set("platform", e.target.value as ScoutPlatform)}
            options={SCOUT_PLATFORMS}
            touch
          />
          <Select
            label="Aspect ratio"
            value={form.aspectRatio}
            onChange={(e) => set("aspectRatio", e.target.value as ScoutAspectRatio)}
            options={SCOUT_ASPECT_RATIOS}
            touch
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Skill level"
            value={form.skillLevel}
            onChange={(e) => set("skillLevel", e.target.value as ScoutSkillLevel)}
            options={SCOUT_SKILL_LEVELS}
            touch
          />
          <Select
            label="Preferred look"
            value={form.preferredLook}
            onChange={(e) => set("preferredLook", e.target.value as ScoutPreferredLook)}
            options={SCOUT_PREFERRED_LOOKS}
            touch
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="App mode"
            value={form.appMode}
            onChange={(e) => set("appMode", e.target.value as ScoutAppMode)}
            options={SCOUT_APP_MODES}
            touch
          />
          <Select
            label="Color grading"
            value={form.colorGradingPreference}
            onChange={(e) =>
              set("colorGradingPreference", e.target.value as ScoutColorGradingPref)
            }
            options={SCOUT_COLOR_GRADING_PREFS}
            touch
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Crew size"
            type="number"
            min={1}
            value={form.crewSize}
            onChange={(e) => set("crewSize", e.target.value)}
            touch
          />
          <Input
            label="Time of day"
            value={form.timeOfDay}
            onChange={(e) => set("timeOfDay", e.target.value)}
            placeholder="day, golden hour, night"
            touch
          />
        </div>
      </ScoutCard>

      <ScoutCard className="space-y-4">
        <h2 className="font-semibold text-slate-900">Camera & gear</h2>
        {gearProfiles.length > 0 && (
          <Select
            label="Load gear profile"
            value={form.selectedGearProfileId}
            onChange={(e) => applyGearProfile(e.target.value)}
            options={[
              { value: "", label: "Manual entry" },
              ...gearProfiles.map((g) => ({ value: g.id, label: g.name })),
            ]}
            touch
          />
        )}
        <Input
          label="Camera body"
          value={form.cameraBody}
          onChange={(e) => set("cameraBody", e.target.value)}
          touch
        />
        <Input
          label="Lenses"
          value={form.lensOptions}
          onChange={(e) => set("lensOptions", e.target.value)}
          touch
        />
        <Input
          label="Lights"
          value={form.lightingGear}
          onChange={(e) => set("lightingGear", e.target.value)}
          touch
        />
        <Input
          label="Audio"
          value={form.audioGear}
          onChange={(e) => set("audioGear", e.target.value)}
          touch
        />
        <Input
          label="Stabilization"
          value={form.stabilizationGear}
          onChange={(e) => set("stabilizationGear", e.target.value)}
          touch
        />
        <Link href="/settings/scout-gear" className="text-xs text-sky-600 hover:underline">
          Save as reusable gear profile →
        </Link>
        <Link href="/settings/lights" className="block text-xs text-sky-600 hover:underline">
          Manage lighting fixtures →
        </Link>
      </ScoutCard>
    </div>
  );
}
