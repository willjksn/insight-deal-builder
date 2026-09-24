"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { generateShootGuide, getShootGuide, updateShootGuide } from "@/lib/shootGuide/apiClient";
import { completedShotCount, emptySetup, emptyShot } from "@/lib/shootGuide/defaults";
import {
  hydrateGuideIfNeeded,
  overviewAfterToneChange,
} from "@/lib/shootGuide/autofill";
import { checklistNeedsBuild } from "@/lib/shootGuide/checklist";
import { needsEquipmentPlan } from "@/lib/shootGuide/matchEquipment";
import { needsVisualIntelligence } from "@/lib/shootGuide/placement";
import { uploadShootGuideReference } from "@/lib/shootGuide/storage";
import {
  SCENE_OUTPUT_LABELS,
  SCENE_OUTPUT_TYPES,
  SHOT_VARIANT_INSTRUCTIONS,
  creativeStyleSelectOptions,
  isNamedCreativeStyle,
  presetFromToneStyle,
  type CreativeStylePreset,
  type SceneOutputType,
  type ShootGuide,
  type ShootGuideNote,
  type ShootGuideReferenceKind,
  type ShootGuideShot,
  type ShootGuideShotStatus,
  type ShotVariantKey,
} from "@/lib/shootGuide/types";
import { preserveShotVisuals } from "@/lib/shootGuide/visualAssets";
import { cn } from "@/lib/utils/cn";
import { useEnsureWorkspace } from "./useEnsureWorkspace";
import { ShootGuideChecklistTab } from "./ShootGuideChecklistTab";
import { ShootGuideGearMatch } from "./ShootGuideGearMatch";
import { ShootGuideSetupVision } from "./ShootGuideSetupVision";
import { ShootGuideSlateTab } from "./ShootGuideSlateTab";
import { ShotVisualPanel } from "./ShotVisualPanel";

const SECTIONS = [
  ["setup", "Scene Setup"],
  ["shots", "Shot Builder"],
  ["preview", "Visual Preview"],
  ["details", "Shoot Details"],
  ["handoff", "Send to Production"],
] as const;

type SceneSection = (typeof SECTIONS)[number][0];

const REF_LABELS: Record<ShootGuideReferenceKind, string> = {
  location: "Location",
  mood: "Mood",
  subject: "Actor",
  product: "Product",
  wardrobe: "Wardrobe",
};

function generalNote(notes: ShootGuideNote[] | undefined): string {
  return notes?.find((n) => n.id === "general")?.body ?? "";
}

function ReadEditBlock({
  label,
  value,
  editing,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <button
          type="button"
          className="text-xs font-semibold text-sky-700 hover:text-sky-900"
          onClick={onToggle}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      {editing ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
      ) : (
        <p className="text-sm leading-relaxed text-slate-800">{value || "—"}</p>
      )}
    </div>
  );
}

const VARIANT_BUTTONS: { key: ShotVariantKey; label: string }[] = [
  { key: "different_lens", label: "Try different lens" },
  { key: "change_angle", label: "Change angle" },
  { key: "simplify", label: "Simplify" },
  { key: "less_gear", label: "Use less gear" },
  { key: "more_cinematic", label: "Make more cinematic" },
];

export function ShootGuideWorkspace({
  guideId,
  generateError,
}: {
  guideId: string;
  generateError?: string;
}) {
  useEnsureWorkspace("scene-builder");
  const router = useRouter();
  const { setWorkspace } = useWorkspace();
  const { user, appUser, loading: authLoading } = useAuth();
  const [guide, setGuide] = useState<ShootGuide | null>(null);
  const [section, setSection] = useState<SceneSection>("setup");
  const [setTool, setSetTool] = useState<"slate" | "checklist" | "notes" | null>(null);
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingShotId, setGeneratingShotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    generateError ? decodeURIComponent(generateError) : null
  );
  const [expandedShot, setExpandedShot] = useState<string | null>(null);
  const [editCopy, setEditCopy] = useState<Record<string, boolean>>({});

  const getToken = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return user.getIdToken();
  }, [user]);

  const applyVisualGuide = useCallback((server: ShootGuide) => {
    setGuide((current) => {
      if (!current) return server;
      return {
        ...current,
        shots: (current.shots ?? []).map((shot) => {
          const remote = (server.shots ?? []).find((item) => item.id === shot.id);
          if (!remote) return shot;
          return { ...shot, visualAssets: remote.visualAssets, visualStatus: remote.visualStatus };
        }),
      };
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getShootGuide(getToken, guideId)
      .then(async ({ guide: next }) => {
        let current = next;
        const patch = hydrateGuideIfNeeded(current);
        if (patch) {
          const { guide: saved } = await updateShootGuide(getToken, current.id, patch);
          current = saved;
        }
        if (needsEquipmentPlan(current) || checklistNeedsBuild(current)) {
          const { guide: exec } = await generateShootGuide(getToken, current.id, {
            stage: "execution",
          });
          current = exec;
        }
        if (needsVisualIntelligence(current)) {
          const { guide: vision } = await generateShootGuide(getToken, current.id, {
            stage: "vision",
          });
          current = vision;
        }
        if (!cancelled) setGuide(current);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load guide");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, guideId, getToken]);

  async function save(patch: Parameters<typeof updateShootGuide>[2]) {
    if (!guide) return;
    setSaving(true);
    setError(null);
    try {
      const { guide: next } = await updateShootGuide(getToken, guide.id, patch);
      setGuide(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function setShot(shotId: string, patch: Partial<ShootGuideShot>) {
    if (!guide) return;
    const shots = (guide.shots ?? []).map((s) => (s.id === shotId ? { ...s, ...patch } : s));
    setGuide({ ...guide, shots });
  }

  async function addReferenceFiles(kind: ShootGuideReferenceKind, list: FileList | null) {
    if (!guide || !user || !list?.length) return;
    setSaving(true);
    setError(null);
    try {
      const uploads = [...(guide.references ?? [])];
      for (const file of Array.from(list)) {
        const uploaded = await uploadShootGuideReference(
          user.uid,
          guide.id,
          kind,
          crypto.randomUUID(),
          file
        );
        uploads.push({
          id: crypto.randomUUID(),
          kind,
          storageUrl: uploaded.storageUrl,
          storagePath: uploaded.storagePath,
          fileName: uploaded.fileName,
        });
      }
      const { guide: next } = await updateShootGuide(getToken, guide.id, { references: uploads });
      setGuide(next);
      setGenerating(true);
      try {
        const { guide: vision } = await generateShootGuide(getToken, next.id, { stage: "vision" });
        setGuide(vision);
      } finally {
        setGenerating(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload still");
    } finally {
      setSaving(false);
    }
  }

  async function persistShots() {
    if (!guide) return;
    await save({ shots: guide.shots });
  }

  async function regenerate(stage: "all" | "shots" | "vision" = "all") {
    if (!guide) return;
    setGenerating(true);
    setError(null);
    try {
      const { guide: generated } = await generateShootGuide(getToken, guide.id, { stage });
      const shots = preserveShotVisuals(guide.shots ?? [], generated.shots ?? []);
      const next = { ...generated, shots };
      if (shots.some((shot, index) => shot !== generated.shots?.[index])) {
        const { guide: saved } = await updateShootGuide(getToken, guide.id, { shots });
        setGuide(saved);
      } else {
        setGuide(next);
      }
      if (stage !== "vision") setSection("shots");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function regenerateShot(shotId: string, instruction?: string) {
    if (!guide) return;
    setGeneratingShotId(shotId);
    setError(null);
    try {
      const { guide: generated } = await generateShootGuide(getToken, guide.id, {
        stage: "shot",
        shotId,
        instruction,
      });
      const shots = preserveShotVisuals(guide.shots ?? [], generated.shots ?? []);
      if (shots.some((shot, index) => shot !== generated.shots?.[index])) {
        const { guide: saved } = await updateShootGuide(getToken, guide.id, { shots });
        setGuide(saved);
      } else {
        setGuide(generated);
      }
      setExpandedShot(shotId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Shot generation failed");
    } finally {
      setGeneratingShotId(null);
    }
  }

  async function setShotStatus(shotId: string, status: ShootGuideShotStatus) {
    if (!guide) return;
    const shots = (guide.shots ?? []).map((s) =>
      s.id === shotId
        ? { ...s, status, visualStatus: status === "ready" ? ("ready" as const) : s.visualStatus }
        : s
    );
    await save({ shots, currentShotId: shotId });
  }

  async function updateShotAssets(shotId: string, patch: Partial<ShootGuideShot>) {
    if (!guide) return;
    const shots = (guide.shots ?? []).map((s) => (s.id === shotId ? { ...s, ...patch } : s));
    setGuide({ ...guide, shots });
    await save({ shots });
  }

  const progress = useMemo(() => {
    const shots = guide?.shots ?? [];
    return { done: completedShotCount(shots), total: shots.length };
  }, [guide]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !appUser) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Sign in to use Scene Builder.</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-slate-600">{error || "Guide not found."}</p>
        <Link href="/scene-builder" className="mt-4 inline-block text-sm font-semibold text-sky-700">
          Back to scenes
        </Link>
      </div>
    );
  }

  const tonePreset = presetFromToneStyle(guide.overview?.toneStyle, guide.creativeStylePreset);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <PageHeader
        title={guide.title || "Untitled scene"}
        subtitle={`${SCENE_OUTPUT_LABELS[guide.outputType || "hybrid"]} · ${progress.done}/${progress.total} shots ready to shoot`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={generating || saving || Boolean(generatingShotId)}
              onClick={() => void regenerate("all")}
            >
              {generating && !generatingShotId ? "Generating…" : "Regenerate"}
            </Button>
            <Link href="/scene-builder">
              <Button variant="outline" size="sm">
                All scenes
              </Button>
            </Link>
          </div>
        }
      />
      <p className="-mt-4 mb-5 text-sm text-slate-500">
        Build the scene here, then send the shots you want into Production.
      </p>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {generating || generatingShotId ? (
        <p className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {generatingShotId ? "Updating this shot…" : "Generating DP shot plan…"}
        </p>
      ) : null}

      <div
        role="tablist"
        aria-label="Scene Builder sections"
        className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200"
      >
        {SECTIONS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            onClick={() => setSection(id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold min-h-[44px]",
              section === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "setup" ? (
        <div className="space-y-4">
          <Input
            label="Scene title"
            value={guide.title}
            onChange={(e) => setGuide({ ...guide, title: e.target.value })}
            touch
          />
          <Textarea
            label="Scene description"
            value={guide.prompt}
            onChange={(e) => setGuide({ ...guide, prompt: e.target.value })}
            placeholder="Stormi is on the treadmill doing a cinematic workout scene."
            rows={4}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Output type</p>
            <div className="grid grid-cols-3 gap-2">
              {SCENE_OUTPUT_TYPES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGuide({ ...guide, outputType: value as SceneOutputType })}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-semibold min-h-[44px]",
                    (guide.outputType || "hybrid") === value
                      ? "border-sky-400 bg-sky-50 text-sky-900"
                      : "border-slate-200 bg-white text-slate-700"
                  )}
                >
                  {SCENE_OUTPUT_LABELS[value]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["subject", "Actor reference"],
                ["location", "Location / environment"],
                ["mood", "Mood / look"],
                ["wardrobe", "Wardrobe"],
              ] as const
            ).map(([kind, label]) => (
              <Input
                key={kind}
                label={label}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => void addReferenceFiles(kind, e.target.files)}
              />
            ))}
          </div>
          {guide.references?.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {guide.references.map((ref) => (
                <figure key={ref.id} className="overflow-hidden rounded-xl border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ref.storageUrl} alt={REF_LABELS[ref.kind] || ref.kind} className="h-24 w-full object-cover" />
                  <figcaption className="px-2 py-1 text-[11px] font-medium text-slate-500">
                    {REF_LABELS[ref.kind] || ref.kind}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No references yet. Shots will inherit whatever you upload here.</p>
          )}
          <details className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">Scene analysis and strategy</summary>
            <div className="mt-3 space-y-4">
          {guide.sceneAnalysis &&
          (guide.sceneAnalysis.subject ||
            guide.sceneAnalysis.action ||
            guide.sceneAnalysis.emotionalGoal) ? (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Scene analysis
              </p>
              <dl className="grid gap-2 text-sm text-slate-800 sm:grid-cols-2">
                {guide.sceneAnalysis.subject ? (
                  <div>
                    <dt className="text-xs text-slate-500">Subject</dt>
                    <dd>{guide.sceneAnalysis.subject}</dd>
                  </div>
                ) : null}
                {guide.sceneAnalysis.action ? (
                  <div>
                    <dt className="text-xs text-slate-500">Action</dt>
                    <dd>{guide.sceneAnalysis.action}</dd>
                  </div>
                ) : null}
                {guide.sceneAnalysis.emotionalGoal ? (
                  <div>
                    <dt className="text-xs text-slate-500">Emotional goal</dt>
                    <dd>{guide.sceneAnalysis.emotionalGoal}</dd>
                  </div>
                ) : null}
                {guide.sceneAnalysis.environment ? (
                  <div>
                    <dt className="text-xs text-slate-500">Environment</dt>
                    <dd>{guide.sceneAnalysis.environment}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
          <ReadEditBlock
            label="Scene summary"
            value={guide.overview?.sceneSummary ?? ""}
            editing={Boolean(editCopy.sceneSummary)}
            onToggle={() => setEditCopy((s) => ({ ...s, sceneSummary: !s.sceneSummary }))}
            onChange={(value) =>
              setGuide({
                ...guide,
                overview: { ...guide.overview, sceneSummary: value },
              })
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-3">
              <Select
                label="Tone / style"
                value={tonePreset}
                onChange={(e) => {
                  const preset = e.target.value as CreativeStylePreset;
                  const currentTone = (guide.overview?.toneStyle ?? "").trim();
                  const customTone =
                    preset === "custom" && currentTone && !isNamedCreativeStyle(currentTone.toLowerCase())
                      ? currentTone
                      : "";
                  const toneStyle = preset === "custom" ? customTone : preset;
                  const nextOverview = overviewAfterToneChange(
                    {
                      ...guide,
                      creativeStylePreset: preset,
                      creativeIntent: toneStyle,
                    },
                    toneStyle
                  );
                  setGuide({
                    ...guide,
                    creativeStylePreset: preset,
                    creativeIntent: toneStyle,
                    overview: nextOverview,
                  });
                }}
                options={creativeStyleSelectOptions()}
                touch
              />
              {tonePreset === "custom" ? (
                <Input
                  label="Custom tone / style"
                  value={guide.overview?.toneStyle ?? ""}
                  onChange={(e) =>
                    setGuide({
                      ...guide,
                      creativeStylePreset: "custom",
                      creativeIntent: e.target.value,
                      overview: { ...guide.overview, toneStyle: e.target.value },
                    })
                  }
                  placeholder="e.g. polished / energetic / intimate"
                  touch
                />
              ) : null}
            </div>
            <Input
              label="Recommended shot count"
              type="number"
              value={guide.overview?.recommendedShotCount ?? guide.desiredShotCount}
              onChange={(e) =>
                setGuide({
                  ...guide,
                  overview: {
                    ...guide.overview,
                    recommendedShotCount: Number(e.target.value) || 0,
                  },
                })
              }
              touch
            />
          </div>
          <ReadEditBlock
            label="Visual objective"
            value={guide.overview?.visualObjective ?? ""}
            editing={Boolean(editCopy.visualObjective)}
            onToggle={() => setEditCopy((s) => ({ ...s, visualObjective: !s.visualObjective }))}
            onChange={(value) =>
              setGuide({
                ...guide,
                overview: { ...guide.overview, visualObjective: value },
              })
            }
          />
          <ReadEditBlock
            label="Visual strategy"
            value={guide.overview?.visualStrategy ?? ""}
            editing={Boolean(editCopy.visualStrategy)}
            onToggle={() => setEditCopy((s) => ({ ...s, visualStrategy: !s.visualStrategy }))}
            onChange={(value) =>
              setGuide({
                ...guide,
                overview: { ...guide.overview, visualStrategy: value },
              })
            }
          />
          <ReadEditBlock
            label="Gear summary"
            value={guide.overview?.gearSummary ?? ""}
            editing={Boolean(editCopy.gearSummary)}
            onToggle={() => setEditCopy((s) => ({ ...s, gearSummary: !s.gearSummary }))}
            onChange={(value) =>
              setGuide({
                ...guide,
                overview: { ...guide.overview, gearSummary: value },
              })
            }
          />
          <p className="text-sm text-slate-500">
            Progress: {progress.done} of {progress.total} shots complete.
            {guide.useMyEquipment ? " Using your Equipment Catalog." : " Ideal gear (not limited to inventory)."}
          </p>
            </div>
          </details>
          <Button
            size="touch"
            disabled={saving}
            onClick={() => {
              setEditCopy({});
              void save({
                title: guide.title,
                prompt: guide.prompt,
                outputType: guide.outputType || "hybrid",
                overview: guide.overview,
                creativeStylePreset: guide.creativeStylePreset,
                creativeIntent: guide.creativeIntent,
              });
            }}
          >
            {saving ? "Saving…" : "Save scene"}
          </Button>
        </div>
      ) : null}

      {section === "details" ? (
        <div className="space-y-4">
          <ShootGuideSetupVision
            guide={guide}
            saving={saving}
            generating={generating}
            onAnalyze={() => void regenerate("vision")}
            onFiles={(kind, files) => void addReferenceFiles(kind, files)}
          />
          {(
            [
              ["locationNotes", "Location"],
              ["lightingNotes", "Lighting plan"],
              ["cameraSettings", "Camera settings"],
              ["equipmentList", "Equipment"],
              ["cameraPlacement", "Camera placement"],
            ] as const
          ).map(([key, label]) => (
            <ReadEditBlock
              key={key}
              label={label}
              value={(guide.setup ?? emptySetup())[key]}
              editing={Boolean(editCopy[key])}
              onToggle={() => setEditCopy((s) => ({ ...s, [key]: !s[key] }))}
              onChange={(value) =>
                setGuide({
                  ...guide,
                  setup: { ...emptySetup(), ...guide.setup, [key]: value },
                })
              }
            />
          ))}
          {guide.equipmentPlan?.items?.length ? (
            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Catalog match
              </p>
              <p className="mb-2 text-sm text-slate-700">{guide.equipmentPlan.summary}</p>
              <ul className="space-y-1 text-sm text-slate-700">
                {guide.equipmentPlan.items.map((row) => (
                  <li key={row.id}>
                    <span className="font-semibold">{row.category}</span>
                    {row.ownedMatch ? ` · ${row.ownedMatch}` : ""}
                    {guide.showIdealWhenNotOwned && row.adjustment && row.ideal
                      ? ` · ideal ${row.ideal}`
                      : ""}
                    {row.adjustment ? ` — ${row.adjustment}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button
            size="touch"
            disabled={saving}
            onClick={() => {
              setEditCopy({});
              void save({ setup: guide.setup });
            }}
          >
            {saving ? "Saving…" : "Save setup"}
          </Button>
        </div>
      ) : null}

      {section === "shots" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={generating || saving || Boolean(generatingShotId)}
              onClick={() => void regenerate("shots")}
            >
              {generating && !generatingShotId ? "Generating…" : "Generate shot list"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const shots = [...(guide.shots ?? []), emptyShot((guide.shots?.length ?? 0) + 1, guide.sourceSceneLabel)];
                setGuide({ ...guide, shots });
              }}
            >
              Add shot
            </Button>
          </div>
          {(guide.shots ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">No shots yet. Generate a sequence from this guide.</p>
          ) : (
            (guide.shots ?? []).map((shot) => (
                <Card key={shot.id}>
                  <CardBody className="space-y-3">
                    <div className="space-y-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Shot {String(shot.shotNumber).padStart(2, "0")}
                        </p>
                        <Input
                          value={shot.title}
                          onChange={(e) => setShot(shot.id, { title: e.target.value })}
                          className="mt-1 font-semibold"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => void setShotStatus(shot.id, "ready")}>
                          Mark ready
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const shots = (guide.shots ?? [])
                              .filter((s) => s.id !== shot.id)
                              .map((s, i) => ({ ...s, shotNumber: i + 1 }));
                            setGuide({ ...guide, shots });
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Framing"
                        value={shot.framing ?? ""}
                        onChange={(e) => setShot(shot.id, { framing: e.target.value })}
                      />
                      <Input
                        label="Lens"
                        value={shot.lens || shot.focalLength || ""}
                        onChange={(e) => setShot(shot.id, { lens: e.target.value })}
                      />
                      <Input
                        label="Camera movement"
                        value={shot.movement ?? ""}
                        onChange={(e) => setShot(shot.id, { movement: e.target.value })}
                      />
                      <Input
                        label="Duration"
                        value={shot.duration ?? ""}
                        onChange={(e) => setShot(shot.id, { duration: e.target.value })}
                        placeholder="4s"
                      />
                    </div>
                    {user ? (
                      <ShotVisualPanel
                        guide={guide}
                        shot={shot}
                        userId={user.uid}
                        compact
                        getToken={getToken}
                        onGuide={applyVisualGuide}
                        onShotChange={(patch) => updateShotAssets(shot.id, patch)}
                      />
                    ) : null}
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-slate-600">
                        Lens and angle variations
                      </summary>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {VARIANT_BUTTONS.map((v) => (
                        <Button
                          key={v.key}
                          variant="outline"
                          size="sm"
                          disabled={generating || generatingShotId === shot.id || saving}
                          onClick={() =>
                            void regenerateShot(shot.id, SHOT_VARIANT_INSTRUCTIONS[v.key])
                          }
                        >
                          {generatingShotId === shot.id ? "Updating…" : v.label}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={generating || generatingShotId === shot.id || saving}
                        onClick={() => void regenerateShot(shot.id)}
                      >
                        Regenerate shot
                      </Button>
                    </div>
                    </details>
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-slate-600">
                        Advanced shot details
                      </summary>
                      <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                        <Textarea
                          label="Shot description"
                          value={shot.purpose}
                          onChange={(e) => setShot(shot.id, { purpose: e.target.value })}
                          rows={2}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input label="Camera" value={shot.camera ?? ""} onChange={(e) => setShot(shot.id, { camera: e.target.value })} />
                          <Input label="Angle" value={shot.cameraAngle ?? ""} onChange={(e) => setShot(shot.id, { cameraAngle: e.target.value })} />
                          <Input label="Focus" value={shot.focusStrategy ?? ""} onChange={(e) => setShot(shot.id, { focusStrategy: e.target.value })} />
                          <Input label="Exposure / settings" value={shot.cameraSettings ?? ""} onChange={(e) => setShot(shot.id, { cameraSettings: e.target.value })} />
                          <Input label="Support / gear" value={shot.support ?? ""} onChange={(e) => setShot(shot.id, { support: e.target.value })} />
                          <Input label="Lighting" value={shot.lightingChanges ?? ""} onChange={(e) => setShot(shot.id, { lightingChanges: e.target.value })} />
                        </div>
                        <Textarea label="Audio notes" value={shot.audioRequirements ?? ""} onChange={(e) => setShot(shot.id, { audioRequirements: e.target.value })} rows={2} />
                        <Textarea label="Technical notes" value={shot.reason ?? ""} onChange={(e) => setShot(shot.id, { reason: e.target.value })} rows={2} />
                        <ShootGuideGearMatch
                          shot={shot}
                          plan={guide.equipmentPlan}
                          showIdealWhenNotOwned={guide.showIdealWhenNotOwned}
                          useMyEquipment={guide.useMyEquipment}
                        />
                      </div>
                    </details>
                  </CardBody>
                </Card>
            ))
          )}
          <Button size="touch" disabled={saving} onClick={() => void persistShots()}>
            {saving ? "Saving…" : "Save shots"}
          </Button>
        </div>
      ) : null}

      {section === "preview" ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Each shot keeps its own stills and clips. Scene references stay on the scene.
          </p>
          {(guide.shots ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">Generate or add shots first.</p>
          ) : (
            (guide.shots ?? []).map((shot) => (
              <Card key={shot.id}>
                <CardBody className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {String(shot.shotNumber).padStart(2, "0")} · {shot.title || "Untitled shot"}
                  </p>
                  {user ? (
                    <ShotVisualPanel
                      guide={guide}
                      shot={shot}
                      userId={user.uid}
                      getToken={getToken}
                      onGuide={applyVisualGuide}
                      onShotChange={(patch) => updateShotAssets(shot.id, patch)}
                    />
                  ) : null}
                </CardBody>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {section === "handoff" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Mark the shots that should move into Production. This keeps the scene here and opens the production project, or the project list if none is linked yet.
          </p>
          {(guide.shots ?? []).map((shot) => (
            <label key={shot.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={selectedShotIds.includes(shot.id)}
                onChange={(e) =>
                  setSelectedShotIds((prev) =>
                    e.target.checked ? [...prev, shot.id] : prev.filter((id) => id !== shot.id)
                  )
                }
              />
              <span>
                <span className="font-semibold text-slate-900">
                  {String(shot.shotNumber).padStart(2, "0")} · {shot.title || "Untitled shot"}
                </span>
                <span className="mt-0.5 block text-slate-500">{shot.purpose || "No description"}</span>
              </span>
            </label>
          ))}
          <Button
            size="touch"
            disabled={saving || selectedShotIds.length === 0}
            onClick={() => {
              const shots = (guide.shots ?? []).map((shot) =>
                selectedShotIds.includes(shot.id) ? { ...shot, status: "ready" as const } : shot
              );
              void save({ shots, status: "ready" }).then(() => {
                setWorkspace("production");
                router.push(guide.projectId ? `/projects/${guide.projectId}` : "/projects");
              });
            }}
          >
            {saving ? "Sending…" : "Send selected shots to Production"}
          </Button>
        </div>
      ) : null}

      <details className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Set tools</summary>
        <p className="mt-2 text-xs text-slate-500">Slate, checklist, and notes stay available without crowding the plan.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["slate", "checklist", "notes"] as const).map((id) => (
            <Button
              key={id}
              variant={setTool === id ? "primary" : "outline"}
              size="sm"
              onClick={() => setSetTool(setTool === id ? null : id)}
            >
              {id[0].toUpperCase() + id.slice(1)}
            </Button>
          ))}
        </div>
      </details>

      {setTool === "slate" ? (
        <ShootGuideSlateTab
          guide={guide}
          saving={saving}
          onChangeCurrent={(shotId) => {
            setGuide({ ...guide, currentShotId: shotId });
            void save({ currentShotId: shotId });
          }}
          onCommit={(next) => {
            setGuide({
              ...guide,
              shots: next.shots,
              slateRecords: next.slateRecords,
              currentShotId: next.currentShotId,
              status: next.status || guide.status,
            });
            void save({
              shots: next.shots,
              slateRecords: next.slateRecords,
              currentShotId: next.currentShotId,
              status: next.status,
            });
          }}
        />
      ) : null}

      {setTool === "checklist" ? (
        <ShootGuideChecklistTab
          items={guide.checklist ?? []}
          saving={saving}
          onToggle={(id) =>
            setGuide({
              ...guide,
              checklist: (guide.checklist ?? []).map((i) =>
                i.id === id ? { ...i, done: !i.done } : i
              ),
            })
          }
          onSave={() => void save({ checklist: guide.checklist })}
        />
      ) : null}

      {setTool === "notes" ? (
        <div className="space-y-4">
          <Textarea
            label="Notes"
            value={generalNote(guide.notes)}
            onChange={(e) => {
              const body = e.target.value;
              const now = new Date().toISOString();
              const existing = guide.notes?.find((n) => n.id === "general");
              const next: ShootGuideNote = existing
                ? { ...existing, body, updatedAt: now }
                : { id: "general", body, createdAt: now, updatedAt: now };
              const others = (guide.notes ?? []).filter((n) => n.id !== "general");
              setGuide({ ...guide, notes: [next, ...others] });
            }}
            touch
            rows={8}
          />
          <Button
            size="touch"
            disabled={saving}
            onClick={() => void save({ notes: guide.notes })}
          >
            {saving ? "Saving…" : "Save notes"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
