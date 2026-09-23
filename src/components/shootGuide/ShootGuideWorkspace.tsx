"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { generateShootGuide, getShootGuide, updateShootGuide } from "@/lib/shootGuide/apiClient";
import { completedShotCount, emptySetup } from "@/lib/shootGuide/defaults";
import {
  hydrateGuideIfNeeded,
  overviewAfterToneChange,
} from "@/lib/shootGuide/autofill";
import { checklistNeedsBuild } from "@/lib/shootGuide/checklist";
import { needsEquipmentPlan } from "@/lib/shootGuide/matchEquipment";
import { needsVisualIntelligence } from "@/lib/shootGuide/placement";
import { uploadShootGuideReference } from "@/lib/shootGuide/storage";
import {
  SHOT_VARIANT_INSTRUCTIONS,
  SHOOT_GUIDE_TABS,
  creativeStyleSelectOptions,
  isNamedCreativeStyle,
  presetFromToneStyle,
  type CreativeStylePreset,
  type ShootGuide,
  type ShootGuideNote,
  type ShootGuideShot,
  type ShootGuideShotStatus,
  type ShootGuideTab,
  type ShotVariantKey,
} from "@/lib/shootGuide/types";
import { cn } from "@/lib/utils/cn";
import { useEnsureWorkspace } from "./useEnsureWorkspace";
import { ShootGuideChecklistTab } from "./ShootGuideChecklistTab";
import { ShootGuideGearMatch } from "./ShootGuideGearMatch";
import { ShootGuideSetupVision } from "./ShootGuideSetupVision";
import { ShootGuideSlateTab } from "./ShootGuideSlateTab";

const TAB_LABELS: Record<ShootGuideTab, string> = {
  overview: "Overview",
  setup: "Setup",
  shots: "Shots",
  slate: "Slate",
  checklist: "Checklist",
  notes: "Notes",
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
  useEnsureWorkspace("shoot-guide");
  const { user, appUser, loading: authLoading } = useAuth();
  const [guide, setGuide] = useState<ShootGuide | null>(null);
  const [tab, setTab] = useState<ShootGuideTab>("overview");
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

  async function addReferenceFiles(kind: "location" | "mood", list: FileList | null) {
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
      const { guide: next } = await generateShootGuide(getToken, guide.id, { stage });
      setGuide(next);
      if (stage !== "vision") setTab("shots");
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
      const { guide: next } = await generateShootGuide(getToken, guide.id, {
        stage: "shot",
        shotId,
        instruction,
      });
      setGuide(next);
      setExpandedShot(shotId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Shot generation failed");
    } finally {
      setGeneratingShotId(null);
    }
  }

  async function setShotStatus(shotId: string, status: ShootGuideShotStatus) {
    if (!guide) return;
    const shots = (guide.shots ?? []).map((s) => (s.id === shotId ? { ...s, status } : s));
    await save({ shots, currentShotId: shotId });
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
        <p className="text-sm text-slate-600">Sign in to use Shoot Guide.</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-slate-600">{error || "Guide not found."}</p>
        <Link href="/shoot-guide" className="mt-4 inline-block text-sm font-semibold text-sky-700">
          Back to guides
        </Link>
      </div>
    );
  }

  const tonePreset = presetFromToneStyle(guide.overview?.toneStyle, guide.creativeStylePreset);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <PageHeader
        title={guide.title || "Untitled shoot guide"}
        subtitle={`${progress.done}/${progress.total} shots complete · ${guide.creativeIntent || "style unset"}`}
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
            <Link href="/shoot-guide">
              <Button variant="outline" size="sm">
                All guides
              </Button>
            </Link>
          </div>
        }
      />
      <p className="-mt-4 mb-5 text-sm text-slate-500">
        Shot cards are DP recommendations — edit any field, or ask for a different lens, angle, or simpler setup.
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
        aria-label="Shoot Guide sections"
        className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200"
      >
        {SHOOT_GUIDE_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold min-h-[44px]",
              tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-4">
          <Input
            label="Title"
            value={guide.title}
            onChange={(e) => setGuide({ ...guide, title: e.target.value })}
            touch
          />
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
          {guide.references?.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {guide.references.map((ref) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={ref.id}
                  src={ref.storageUrl}
                  alt={ref.kind}
                  className="h-24 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          ) : null}
          <Button
            size="touch"
            disabled={saving}
            onClick={() => {
              setEditCopy({});
              void save({
                title: guide.title,
                overview: guide.overview,
                creativeStylePreset: guide.creativeStylePreset,
                creativeIntent: guide.creativeIntent,
              });
            }}
          >
            {saving ? "Saving…" : "Save overview"}
          </Button>
        </div>
      ) : null}

      {tab === "setup" ? (
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

      {tab === "shots" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={generating || saving || Boolean(generatingShotId)}
              onClick={() => void regenerate("shots")}
            >
              {generating && !generatingShotId ? "Generating…" : "Regenerate shots"}
            </Button>
          </div>
          {(guide.shots ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">No shots yet. Generate a sequence from this guide.</p>
          ) : (
            (guide.shots ?? []).map((shot) => {
              const open = expandedShot === shot.id;
              return (
                <Card key={shot.id}>
                  <CardBody className="space-y-3">
                    <div className="space-y-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Shot {String(shot.shotNumber).padStart(2, "0")}
                          {shot.status !== "planned" ? ` · ${shot.status}` : ""}
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
                        <Button variant="outline" size="sm" onClick={() => void setShotStatus(shot.id, "complete")}>
                          Complete shot
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      label="Purpose"
                      value={shot.purpose}
                      onChange={(e) => setShot(shot.id, { purpose: e.target.value })}
                      placeholder="Why this shot exists"
                      rows={2}
                    />
                    <p className="text-sm leading-relaxed text-slate-600">
                      {shot.reason || "No DP note yet."}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Framing"
                        value={shot.framing ?? ""}
                        onChange={(e) => setShot(shot.id, { framing: e.target.value })}
                      />
                      <Input
                        label="Camera position / height"
                        value={[shot.cameraPosition, shot.cameraHeight].filter(Boolean).join(" · ")}
                        onChange={(e) => setShot(shot.id, { cameraPosition: e.target.value })}
                      />
                      <Input
                        label="Movement"
                        value={shot.movement ?? ""}
                        onChange={(e) => setShot(shot.id, { movement: e.target.value })}
                      />
                      <Input
                        label="Focus"
                        value={shot.focusStrategy ?? ""}
                        onChange={(e) => setShot(shot.id, { focusStrategy: e.target.value })}
                      />
                      <Input
                        label="Camera"
                        value={shot.camera ?? ""}
                        onChange={(e) => setShot(shot.id, { camera: e.target.value })}
                      />
                      <Input
                        label="Lens"
                        value={shot.lens || shot.focalLength || ""}
                        onChange={(e) => setShot(shot.id, { lens: e.target.value })}
                      />
                      <Input
                        label="Support"
                        value={shot.support ?? ""}
                        onChange={(e) => setShot(shot.id, { support: e.target.value })}
                      />
                      <Input
                        label="Angle"
                        value={shot.cameraAngle ?? ""}
                        onChange={(e) => setShot(shot.id, { cameraAngle: e.target.value })}
                      />
                    </div>
                    <ShootGuideGearMatch
                      shot={shot}
                      plan={guide.equipmentPlan}
                      showIdealWhenNotOwned={guide.showIdealWhenNotOwned}
                      useMyEquipment={guide.useMyEquipment}
                    />
                    <div className="flex flex-wrap gap-2">
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
                    <button
                      type="button"
                      className="text-sm font-semibold text-sky-700"
                      onClick={() => setExpandedShot(open ? null : shot.id)}
                    >
                      {open ? "Hide details" : "Settings, performance, why"}
                    </button>
                    {open ? (
                      <div className="space-y-3 border-t border-slate-100 pt-3">
                        <Textarea
                          label="Why this setup"
                          value={shot.reason ?? ""}
                          onChange={(e) => setShot(shot.id, { reason: e.target.value })}
                          rows={2}
                        />
                        <Textarea
                          label="Lighting changes"
                          value={shot.lightingChanges ?? ""}
                          onChange={(e) => setShot(shot.id, { lightingChanges: e.target.value })}
                          rows={2}
                        />
                        <Textarea
                          label="Performance"
                          value={shot.performanceDirection ?? ""}
                          onChange={(e) => setShot(shot.id, { performanceDirection: e.target.value })}
                          rows={2}
                        />
                        <Textarea
                          label="Continuity / audio"
                          value={[shot.continuityRequirements, shot.audioRequirements].filter(Boolean).join("\n")}
                          onChange={(e) => setShot(shot.id, { continuityRequirements: e.target.value })}
                          rows={2}
                        />
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
              );
            })
          )}
          <Button size="touch" disabled={saving} onClick={() => void persistShots()}>
            {saving ? "Saving…" : "Save shots"}
          </Button>
        </div>
      ) : null}

      {tab === "slate" ? (
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

      {tab === "checklist" ? (
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

      {tab === "notes" ? (
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
