"use client";

import { BrandProfile, ContentGoal, IdeaGenerationInputs } from "@/lib/contentIdeas/types";
import {
  CONTENT_GOAL_OPTIONS,
  FORMAT_OPTIONS,
  LOOK_OPTIONS,
  PLATFORM_OPTIONS,
  TONE_OPTIONS,
} from "@/lib/contentIdeas/defaults";
import { Input } from "@/components/ui/Input";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </span>
  );
}

function ChipToggle({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        selected ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function toggleList<T extends string>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function IdeaEngineForm({
  inputs,
  onChange,
  profiles,
  profileId,
  onProfileChange,
}: {
  inputs: IdeaGenerationInputs;
  onChange: (next: IdeaGenerationInputs) => void;
  profiles: BrandProfile[];
  profileId?: string;
  onProfileChange: (id: string | undefined) => void;
}) {
  const set = <K extends keyof IdeaGenerationInputs>(key: K, value: IdeaGenerationInputs[K]) =>
    onChange({ ...inputs, [key]: value });

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>Brand profile (optional)</FieldLabel>
        <select
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={profileId ?? ""}
          onChange={(e) => onProfileChange(e.target.value || undefined)}
        >
          <option value="">No profile — infer from rough idea</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.basic.profileName}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Full profiles improve fit scoring. Trends come from weekly Tavily snapshots, not live search.
        </p>
      </div>

      <div>
        <FieldLabel>What are you thinking? *</FieldLabel>
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          rows={4}
          value={inputs.roughIdea}
          placeholder="e.g. Cinematic reel series for a med spa — luxury, mysterious, appointment-focused"
          onChange={(e) => set("roughIdea", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Campaign name</FieldLabel>
          <Input className="mt-1" value={inputs.campaignName ?? ""} onChange={(e) => set("campaignName", e.target.value)} />
        </div>
        <div>
          <FieldLabel>Weekly theme</FieldLabel>
          <Input className="mt-1" value={inputs.weeklyTheme ?? ""} onChange={(e) => set("weeklyTheme", e.target.value)} />
        </div>
      </div>

      <div>
        <FieldLabel>Goals</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONTENT_GOAL_OPTIONS.map((g) => (
            <ChipToggle
              key={g.id}
              label={g.label}
              selected={inputs.goals.includes(g.id as ContentGoal)}
              onToggle={() => set("goals", toggleList(inputs.goals, g.id as ContentGoal))}
            />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Platforms</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((p) => (
            <ChipToggle
              key={p}
              label={p}
              selected={inputs.platforms.includes(p)}
              onToggle={() => set("platforms", toggleList(inputs.platforms, p))}
            />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Content formats</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map((f) => (
            <ChipToggle
              key={f}
              label={f.replace(/_/g, " ")}
              selected={inputs.contentFormats.includes(f)}
              onToggle={() => set("contentFormats", toggleList(inputs.contentFormats, f))}
            />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Look & tone</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {LOOK_OPTIONS.map((l) => (
            <ChipToggle
              key={l}
              label={l}
              selected={inputs.lookTags.includes(l)}
              onToggle={() => set("lookTags", toggleList(inputs.lookTags, l))}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {TONE_OPTIONS.map((t) => (
            <ChipToggle
              key={t}
              label={t}
              selected={inputs.toneTags.includes(t)}
              onToggle={() => set("toneTags", toggleList(inputs.toneTags, t))}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FieldLabel>Ideas to generate</FieldLabel>
          <Input
            type="number"
            min={3}
            max={12}
            className="mt-1"
            value={inputs.ideaCount}
            onChange={(e) => set("ideaCount", Math.min(12, Math.max(3, Number(e.target.value) || 7)))}
          />
        </div>
        <div>
          <FieldLabel>Time available</FieldLabel>
          <Input className="mt-1" value={inputs.timeAvailable ?? ""} placeholder="half-day" onChange={(e) => set("timeAvailable", e.target.value)} />
        </div>
        <div>
          <FieldLabel>Production difficulty</FieldLabel>
          <Input className="mt-1" value={inputs.productionDifficulty ?? ""} placeholder="moderate" onChange={(e) => set("productionDifficulty", e.target.value)} />
        </div>
      </div>

      <div>
        <FieldLabel>Production resources this week</FieldLabel>
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          rows={2}
          value={inputs.productionResources ?? ""}
          placeholder="Locations, talent, gear constraints..."
          onChange={(e) => set("productionResources", e.target.value)}
        />
      </div>
    </div>
  );
}

export const DEFAULT_IDEA_INPUTS: IdeaGenerationInputs = {
  roughIdea: "",
  goals: ["awareness"],
  platforms: ["Instagram Reels"],
  contentFormats: ["cinematic_commercial"],
  lookTags: ["Cinematic"],
  toneTags: ["Confident"],
  ideaCount: 7,
  quickMode: true,
};
