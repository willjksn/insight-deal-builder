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
import { getShootGuide, updateShootGuide } from "@/lib/shootGuide/apiClient";
import { completedShotCount, emptySetup } from "@/lib/shootGuide/defaults";
import {
  hydrateGuideIfNeeded,
  overviewAfterToneChange,
} from "@/lib/shootGuide/autofill";
import {
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
} from "@/lib/shootGuide/types";
import { cn } from "@/lib/utils/cn";
import { useEnsureWorkspace } from "./useEnsureWorkspace";

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

export function ShootGuideWorkspace({ guideId }: { guideId: string }) {
  useEnsureWorkspace("shoot-guide");
  const { user, appUser, loading: authLoading } = useAuth();
  const [guide, setGuide] = useState<ShootGuide | null>(null);
  const [tab, setTab] = useState<ShootGuideTab>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        const patch = hydrateGuideIfNeeded(next);
        if (patch) {
          const { guide: saved } = await updateShootGuide(getToken, next.id, patch);
          if (!cancelled) setGuide(saved);
          return;
        }
        if (!cancelled) setGuide(next);
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

  async function persistShots() {
    if (!guide) return;
    await save({ shots: guide.shots });
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
          <Link href="/shoot-guide">
            <Button variant="outline" size="sm">
              All guides
            </Button>
          </Link>
        }
      />
      <p className="-mt-4 mb-5 text-sm text-slate-500">
        Plan copy is filled from your scene, style, and priorities. Open Edit on a section only if you want to change it.
      </p>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
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
          {(guide.shots ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">No shots yet. Create a new guide with a shot count to seed this list.</p>
          ) : (
            (guide.shots ?? []).map((shot) => {
              const open = expandedShot === shot.id;
              return (
                <Card key={shot.id}>
                  <CardBody className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
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
                    </div>
                    <p className="text-sm text-slate-500">
                      Camera {shot.cameraId || "—"} · Lens {shot.focalLength || shot.lensId || "—"} · Support {shot.supportId || "—"}
                    </p>
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
        <Card>
          <CardBody className="space-y-2 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Slate / take tracking</p>
            <p>
              Roll, scene, shot, take, camera roll, sound roll, GOOD / NG / HOLD / CIRCLE, and Next Take land in Sprint 3.
              This guide already stores <code className="text-xs">slateRecords</code> and per-shot <code className="text-xs">takeRecords</code>.
            </p>
            <p>{guide.slateRecords?.length ?? 0} slate records saved.</p>
          </CardBody>
        </Card>
      ) : null}

      {tab === "checklist" ? (
        <Card>
          <CardBody className="space-y-2 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Dynamic checklist</p>
            <p>
              Room, camera, lighting, audio, continuity, shot, and wrap items will generate from the actual scene in Sprint 3.
            </p>
            <p>{guide.checklist?.length ?? 0} checklist items saved.</p>
          </CardBody>
        </Card>
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
