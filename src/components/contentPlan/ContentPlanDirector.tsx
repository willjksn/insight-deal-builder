"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Copy,
  FolderKanban,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  cloneContentPlan,
  createContentPlan,
  createProjectFromContentPlan,
  deleteContentPlan,
  generateContentPlan,
  listContentPlans,
  syncLinkedProjectFromContentPlan,
  updateContentPlan,
} from "@/lib/contentPlan/apiClient";
import {
  CONTENT_STYLE_OPTIONS,
  CTA_OPTIONS,
  DIALOGUE_OPTIONS,
  DURATION_OPTIONS,
  ENERGY_OPTIONS,
  ORIENTATION_OPTIONS,
  PLATFORM_OPTIONS,
  defaultContentPlanInputs,
  type ContentPlan,
  type ContentPlanGenerateSection,
  type ContentPlanInputs,
  type ContentPlanSection,
  type ContentShot,
} from "@/lib/contentPlan/types";
import {
  EditMapPanel,
  LightingPanel,
  LookPanel,
  MusicPanel,
  Phase2SummaryActions,
  SoundPanel,
} from "@/components/contentPlan/ContentPlanPhase2Panels";
import {
  ChecklistPanel,
  CompletionBar,
  CoveragePanel,
  Phase3SummaryActions,
  ShootModePanel,
  ShootOrderPanel,
} from "@/components/contentPlan/ContentPlanPhase3Panels";
import { ContentPlanPhase5Bar } from "@/components/contentPlan/ContentPlanPhase5Bar";
import { useAccessibleProjects } from "@/hooks/useAccessibleProjects";
import { useLocationCatalog } from "@/hooks/useLocationCatalog";
import { useAuth } from "@/contexts/AuthContext";
import {
  creatorCatalogNotes,
  formatLocationCatalogLabel,
  locationCatalogNotes,
} from "@/lib/contentPlan/catalogPickers";
import { listCreators } from "@/lib/creators/apiClient";
import type { Creator } from "@/lib/creators/types";
import { getProductionBoardByProject } from "@/lib/firebase/productionFirestore";
import {
  flattenShootingKit,
  normalizeShootingKit,
  shootingKitFromLegacy,
  shootingKitHasGear,
} from "@/lib/production/shootingKit";
import { canManageCreators } from "@/lib/utils/permissions";
import { cn } from "@/lib/utils/cn";

type GetToken = () => Promise<string | null>;

type Props = {
  getToken: GetToken;
  /** Deep-link from Weekly Idea Engine / bookmarks. */
  initialPlanId?: string | null;
  /** When true, omit the inline saved-plans list (library lives at /content-plans). */
  hideSavedPlans?: boolean;
};

const SECTIONS: { id: ContentPlanSection; label: string; ready: boolean }[] = [
  { id: "brief", label: "Creative Brief", ready: true },
  { id: "beats", label: "Story", ready: true },
  { id: "script", label: "Script", ready: true },
  { id: "shots", label: "Shots", ready: true },
  { id: "edit", label: "Edit Map", ready: true },
  { id: "sound", label: "Sound", ready: true },
  { id: "music", label: "Music", ready: true },
  { id: "look", label: "Look", ready: true },
  { id: "lighting", label: "Lighting", ready: true },
  { id: "coverage", label: "Coverage", ready: true },
  { id: "shoot_order", label: "Shoot Order", ready: true },
  { id: "checklist", label: "Checklist", ready: true },
  { id: "davinci", label: "Shoot Mode", ready: true },
];

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function textInputClassName() {
  return "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-sky-200 focus:ring-2";
}

function ShotCard({
  shot,
  teachMe,
  defaultOpen,
  userId,
  planId,
  onPatch,
}: {
  shot: ContentShot;
  teachMe: boolean;
  defaultOpen?: boolean;
  userId?: string | null;
  planId?: string;
  onPatch?: (shotId: string, partial: Partial<ContentShot>) => void;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [howOpen, setHowOpen] = useState(false);
  const [uploadingFrame, setUploadingFrame] = useState(false);
  const [frameUrlDraft, setFrameUrlDraft] = useState(shot.referenceImageUrl || "");

  useEffect(() => {
    setFrameUrlDraft(shot.referenceImageUrl || "");
  }, [shot.referenceImageUrl]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        {shot.referenceImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shot.referenceImageUrl}
            alt=""
            className="mt-0.5 h-14 w-10 shrink-0 rounded-md object-cover"
          />
        ) : open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-sky-800">
              Shot {String(shot.shotNumber).padStart(2, "0")}
            </span>
            <span className="text-xs text-slate-500">
              {shot.startTime}–{shot.endTime}
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
              {shot.shotSize}
            </span>
          </div>
          <p className="mt-0.5 font-semibold text-slate-900">{shot.shotName}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{shot.visualDescription}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
            {shot.cameraBody ? <span>Camera: {shot.cameraBody}</span> : null}
            {shot.lens || shot.focalLength ? (
              <span>Lens: {shot.lens || shot.focalLength}</span>
            ) : null}
            <span>Move: {shot.movement}</span>
            {shot.transitionOut || shot.cutTrigger ? (
              <span>Edit: {shot.transitionOut || shot.cutTrigger}</span>
            ) : null}
            {shot.speedRampNotes ? <span>Speed: {shot.speedRampNotes}</span> : null}
          </div>
        </div>
        {!shot.referenceImageUrl ? null : open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        )}
      </button>

      {open ? (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm">
          {onPatch ? (
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Reference frame
              </p>
              {shot.referenceImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shot.referenceImageUrl}
                  alt={`Reference for ${shot.shotName}`}
                  className="max-h-40 w-auto rounded-lg border border-slate-200 object-contain"
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                <input
                  value={frameUrlDraft}
                  onChange={(e) => setFrameUrlDraft(e.target.value)}
                  onBlur={() => {
                    const next = frameUrlDraft.trim();
                    if (next !== (shot.referenceImageUrl || "")) {
                      onPatch(shot.id, { referenceImageUrl: next || undefined });
                    }
                  }}
                  placeholder="Paste image URL"
                  className={textInputClassName()}
                />
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  {uploadingFrame ? "Uploading…" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingFrame || !userId || !planId}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file || !userId || !planId || !onPatch) return;
                      setUploadingFrame(true);
                      void import("@/lib/contentPlan/storage")
                        .then(({ uploadContentPlanShotImage }) =>
                          uploadContentPlanShotImage(userId, planId, shot.id, file)
                        )
                        .then(({ storageUrl }) => {
                          setFrameUrlDraft(storageUrl);
                          onPatch(shot.id, { referenceImageUrl: storageUrl });
                        })
                        .catch(() => undefined)
                        .finally(() => setUploadingFrame(false));
                    }}
                  />
                </label>
                {shot.referenceImageUrl ? (
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setFrameUrlDraft("");
                      onPatch(shot.id, { referenceImageUrl: undefined });
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          ) : shot.referenceImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shot.referenceImageUrl}
              alt={`Reference for ${shot.shotName}`}
              className="max-h-40 w-auto rounded-lg border border-slate-200 object-contain"
            />
          ) : null}

          <Block title="Creative purpose" body={shot.storyPurpose} />
          <Block
            title="Camera"
            body={[
              shot.cameraBody && `Body: ${shot.cameraBody}`,
              (shot.lens || shot.focalLength) && `Lens: ${shot.lens || shot.focalLength}`,
              shot.frameRate && `FPS: ${shot.frameRate}`,
              shot.shutter && `Shutter: ${shot.shutter}`,
              shot.aperture && `Aperture: ${shot.aperture}`,
              shot.isoStrategy && `ISO: ${shot.isoStrategy}`,
              shot.whiteBalance && `WB: ${shot.whiteBalance}`,
              shot.cameraHeight && `Height: ${shot.cameraHeight}`,
              shot.cameraDistance && `Distance: ${shot.cameraDistance}`,
              shot.cameraAngle && `Angle: ${shot.cameraAngle}`,
              shot.movementInstructions && `Movement: ${shot.movementInstructions}`,
            ]
              .filter(Boolean)
              .join("\n")}
          />
          <Block
            title="Composition"
            body={[
              shot.composition,
              shot.subjectPlacement && `Subject: ${shot.subjectPlacement}`,
              shot.foreground && `FG: ${shot.foreground}`,
              shot.background && `BG: ${shot.background}`,
              shot.depthNotes && `Depth: ${shot.depthNotes}`,
              shot.focusStrategy && `Focus: ${shot.focusStrategy}`,
            ]
              .filter(Boolean)
              .join("\n")}
          />
          <Block
            title="Lighting"
            body={[
              shot.lightingIntent,
              shot.motivatedSource && `Motivated: ${shot.motivatedSource}`,
              shot.keyLightDirection && `Key: ${shot.keyLightDirection}`,
              shot.fillStrategy && `Fill: ${shot.fillStrategy}`,
              shot.backlightStrategy && `Backlight: ${shot.backlightStrategy}`,
              shot.practicals && `Practicals: ${shot.practicals}`,
            ]
              .filter(Boolean)
              .join("\n")}
          />
          <Block
            title="Performance"
            body={[
              shot.performanceDirection,
              shot.blocking && `Blocking: ${shot.blocking}`,
              shot.propAction && `Props: ${shot.propAction}`,
            ]
              .filter(Boolean)
              .join("\n")}
          />
          <Block
            title="Edit / sound"
            body={[
              shot.cutTrigger && `Cut trigger: ${shot.cutTrigger}`,
              shot.editorNotes && `Editor: ${shot.editorNotes}`,
              shot.productionAudio && `Prod audio: ${shot.productionAudio}`,
              shot.foley && `Foley: ${shot.foley}`,
              shot.soundEffects && `SFX: ${shot.soundEffects}`,
              shot.musicCue && `Music: ${shot.musicCue}`,
              shot.colorLook && `Color: ${shot.colorLook}`,
              shot.graphics && `Graphics: ${shot.graphics}`,
            ]
              .filter(Boolean)
              .join("\n")}
          />

          {onPatch ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Transition in
                </span>
                <input
                  defaultValue={shot.transitionInto || ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (shot.transitionInto || "")) {
                      onPatch(shot.id, { transitionInto: v || undefined });
                    }
                  }}
                  placeholder="e.g. cut / dissolve"
                  className={textInputClassName()}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Transition out
                </span>
                <input
                  defaultValue={shot.transitionOut || ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (shot.transitionOut || "")) {
                      onPatch(shot.id, { transitionOut: v || undefined });
                    }
                  }}
                  placeholder="e.g. whip pan"
                  className={textInputClassName()}
                />
              </label>
              <label className="block space-y-1 sm:col-span-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Speed ramp
                </span>
                <input
                  defaultValue={shot.speedRampNotes || ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (shot.speedRampNotes || "")) {
                      onPatch(shot.id, { speedRampNotes: v || undefined });
                    }
                  }}
                  placeholder="e.g. slow push 80%"
                  className={textInputClassName()}
                />
              </label>
            </div>
          ) : (
            <Block
              title="Transitions / speed"
              body={[
                shot.transitionInto && `In: ${shot.transitionInto}`,
                shot.transitionOut && `Out: ${shot.transitionOut}`,
                shot.speedRampNotes && `Speed: ${shot.speedRampNotes}`,
              ]
                .filter(Boolean)
                .join("\n")}
            />
          )}

          {teachMe && shot.teachMeNotes ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                Teach me
              </p>
              <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{shot.teachMeNotes}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-sky-100 bg-sky-50/70">
            <button
              type="button"
              onClick={() => setHowOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">
                How to shoot it
              </span>
              {howOpen ? (
                <ChevronDown className="h-4 w-4 text-sky-800" />
              ) : (
                <ChevronRight className="h-4 w-4 text-sky-800" />
              )}
            </button>
            {howOpen ? (
              <div className="space-y-3 border-t border-sky-100 px-3 py-3">
                <ol className="list-decimal space-y-1.5 pl-4 text-sm text-slate-800">
                  {shot.howToShoot.steps.map((s, i) => (
                    <li key={`${shot.id}-hs-${i}`}>{s}</li>
                  ))}
                </ol>
                {shot.howToShoot.commonMistakes.length ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-800">
                      Common mistakes
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-800">
                      {shot.howToShoot.commonMistakes.map((s, i) => (
                        <li key={`${shot.id}-cm-${i}`}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {shot.howToShoot.continuity.length ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                      Continuity
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-800">
                      {shot.howToShoot.continuity.map((s, i) => (
                        <li key={`${shot.id}-ct-${i}`}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Block({ title, body }: { title: string; body?: string }) {
  if (!body?.trim()) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-slate-800">{body}</p>
    </div>
  );
}

export function ContentPlanDirector({
  getToken,
  initialPlanId,
  hideSavedPlans = false,
}: Props) {
  const router = useRouter();
  const { user, appUser } = useAuth();
  const { projects, loading: projectsLoading } = useAccessibleProjects();
  const {
    data: locationCatalog,
    loading: locationsLoading,
  } = useLocationCatalog();
  const [step, setStep] = useState(1);
  const [inputs, setInputs] = useState<ContentPlanInputs>(() => defaultContentPlanInputs());
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<ContentPlan[]>([]);
  const [section, setSection] = useState<ContentPlanSection>("brief");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [syncingProject, setSyncingProject] = useState(false);
  const [kitProjectId, setKitProjectId] = useState("");
  const [kitBusy, setKitBusy] = useState(false);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [projectLinks, setProjectLinks] = useState<{
    projectId: string;
    scriptSessionId: string;
  } | null>(null);

  const showCreatorCatalog = canManageCreators(appUser);

  useEffect(() => {
    if (!plan) {
      setTitleDraft("");
      return;
    }
    setTitleDraft(plan.creativeBrief?.workingTitle || plan.title || "");
  }, [plan?.id, plan?.title, plan?.creativeBrief?.workingTitle]);

  useEffect(() => {
    if (hideSavedPlans) return;
    void listContentPlans(getToken)
      .then(({ plans }) => setSavedPlans(plans))
      .catch(() => undefined);
  }, [getToken, hideSavedPlans]);

  useEffect(() => {
    if (!initialPlanId) return;
    void loadPlan(initialPlanId);
    // Intentionally only when deep-link id arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadPlan is stable enough for mount/deep-link
  }, [initialPlanId, getToken]);

  useEffect(() => {
    if (!showCreatorCatalog) {
      setCreators([]);
      return;
    }
    let cancelled = false;
    setCreatorsLoading(true);
    void listCreators(getToken)
      .then((list) => {
        if (cancelled) return;
        setCreators(list.filter((c) => c.status === "active"));
      })
      .catch(() => {
        if (!cancelled) setCreators([]);
      })
      .finally(() => {
        if (!cancelled) setCreatorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getToken, showCreatorCatalog]);

  const teachMe = plan?.teachMe ?? inputs.teachMe;

  const progressLabel = useMemo(() => {
    if (!plan) return null;
    const p = plan.progress || {};
    const p1 = [p.brief, p.beats, p.script, p.shots].filter(Boolean).length;
    const p2 = [p.edit, p.sound, p.music, p.look, p.lighting].filter(Boolean).length;
    const p3 = [p.coverage, p.shootOrder, p.checklist].filter(Boolean).length;
    return `P1 ${p1}/4 · P2 ${p2}/5 · P3 ${p3}/3`;
  }, [plan]);

  async function loadKitFromProject() {
    if (!kitProjectId) {
      setError("Choose a project with a shooting kit first.");
      return;
    }
    setKitBusy(true);
    setError(null);
    try {
      const board = await getProductionBoardByProject(kitProjectId);
      if (!board) {
        setError("No production board found for that project.");
        return;
      }
      const kit = shootingKitFromLegacy(board.shootingKit, board.gearItems ?? []);
      if (!shootingKitHasGear(normalizeShootingKit(kit))) {
        setError("That project’s shooting kit is empty. Add gear on the production board first.");
        return;
      }
      const other = [
        ...kit.supports,
        ...kit.grip,
        ...kit.audio,
        ...kit.props,
        ...kit.other,
      ];
      patchInputs({
        camerasAvailable: kit.cameraBodies.join(", ") || inputs.camerasAvailable,
        lensesAvailable: kit.lenses.join(", ") || inputs.lensesAvailable,
        lightingAvailable: kit.lights.join(", ") || inputs.lightingAvailable,
        equipmentAvailable: other.join(", ") || inputs.equipmentAvailable,
        useAvailableGearOnly: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load shooting kit");
    } finally {
      setKitBusy(false);
    }
  }

  function patchInputs(partial: Partial<ContentPlanInputs>) {
    setInputs((prev) => {
      const next = { ...prev, ...partial };
      const preset = DURATION_OPTIONS.find((d) => d.value === next.durationPreset);
      if (next.durationPreset !== "custom" && preset) {
        next.durationSeconds = preset.seconds;
      }
      return next;
    });
  }

  async function onGenerate() {
    if (!inputs.idea.trim()) {
      setError("Describe what you want to create.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let current = plan;
      let createdNew = false;
      if (!current) {
        const created = await createContentPlan(getToken, {
          inputs,
          title: inputs.idea.slice(0, 60),
        });
        current = created.plan;
        setPlan(current);
        createdNew = true;
      } else {
        const updated = await updateContentPlan(getToken, current.id, { inputs });
        current = updated.plan;
        setPlan(current);
      }
      const generated = await generateContentPlan(getToken, current.id, "phase1");
      setPlan(generated.plan);
      setSection("brief");
      setStep(4);
      if (createdNew) {
        router.replace(`/content-plans/${current.id}`);
      } else if (!hideSavedPlans) {
        const listed = await listContentPlans(getToken);
        setSavedPlans(listed.plans);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const { plan: next } = await updateContentPlan(getToken, plan.id, {
        inputs,
        title: titleDraft.trim() || plan.creativeBrief?.workingTitle || plan.title,
        teachMe: inputs.teachMe,
      });
      setPlan(next);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1600);
      const listed = await listContentPlans(getToken);
      setSavedPlans(listed.plans);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveTitle() {
    if (!plan) return;
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setError("Title cannot be empty.");
      return;
    }
    if (nextTitle === (plan.creativeBrief?.workingTitle || plan.title)) return;
    setSaving(true);
    setError(null);
    try {
      const { plan: next } = await updateContentPlan(getToken, plan.id, {
        title: nextTitle,
      });
      setPlan(next);
      const listed = await listContentPlans(getToken);
      setSavedPlans(listed.plans);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename plan");
    } finally {
      setSaving(false);
    }
  }

  async function onPatchShot(shotId: string, partial: Partial<ContentShot>) {
    if (!plan) return;
    const shots = (plan.shots || []).map((s) =>
      s.id === shotId ? { ...s, ...partial } : s
    );
    setPlan({ ...plan, shots });
    try {
      const { plan: next } = await updateContentPlan(getToken, plan.id, { shots });
      setPlan(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update shot");
    }
  }

  async function onCreateProject() {
    if (!plan) return;
    if (!plan.shots?.length) {
      setError("Generate shots before creating a project.");
      return;
    }
    setCreatingProject(true);
    setError(null);
    try {
      await updateContentPlan(getToken, plan.id, { inputs });
      const result = await createProjectFromContentPlan(getToken, plan.id, {
        projectName: plan.creativeBrief?.workingTitle || plan.title,
      });
      setPlan(result.plan);
      setProjectLinks({
        projectId: result.projectId,
        scriptSessionId: result.scriptSessionId,
      });
      const listed = await listContentPlans(getToken);
      setSavedPlans(listed.plans);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create project failed");
    } finally {
      setCreatingProject(false);
    }
  }

  async function onSyncLinkedProject() {
    if (!plan?.projectId && !projectLinks?.projectId) {
      setError("Link a project first (Create project from plan).");
      return;
    }
    if (!plan?.shots?.length) {
      setError("Generate shots before updating the linked project.");
      return;
    }
    setSyncingProject(true);
    setError(null);
    try {
      await updateContentPlan(getToken, plan.id, { inputs });
      const result = await syncLinkedProjectFromContentPlan(getToken, plan.id);
      setPlan(result.plan);
      setProjectLinks({
        projectId: result.projectId,
        scriptSessionId: result.scriptSessionId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update linked project failed");
    } finally {
      setSyncingProject(false);
    }
  }

  async function regenerate(sectionName: ContentPlanGenerateSection) {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      await updateContentPlan(getToken, plan.id, { inputs });
      const { plan: next } = await generateContentPlan(getToken, plan.id, sectionName);
      setPlan(next);
      if (sectionName === "phase2") setSection("edit");
      else if (sectionName === "phase3") setSection("coverage");
      else if (
        sectionName === "edit" ||
        sectionName === "sound" ||
        sectionName === "music" ||
        sectionName === "look" ||
        sectionName === "lighting" ||
        sectionName === "coverage" ||
        sectionName === "shoot_order" ||
        sectionName === "checklist"
      ) {
        setSection(sectionName === "shoot_order" ? "shoot_order" : sectionName);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regenerate failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadPlan(id: string) {
    setBusy(true);
    setError(null);
    try {
      const { getContentPlan } = await import("@/lib/contentPlan/apiClient");
      const { plan: next } = await getContentPlan(getToken, id);
      setPlan(next);
      setInputs(defaultContentPlanInputs(next.inputs));
      setProjectLinks(
        next.projectId
          ? {
              projectId: next.projectId,
              scriptSessionId: next.scriptSessionId || "",
            }
          : null
      );
      setStep(4);
      setSection("brief");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plan");
    } finally {
      setBusy(false);
    }
  }

  async function onClonePlan(id: string) {
    setBusy(true);
    setError(null);
    try {
      const { plan: next } = await cloneContentPlan(getToken, id);
      if (!hideSavedPlans) {
        const listed = await listContentPlans(getToken);
        setSavedPlans(listed.plans);
      }
      setPlan(next);
      setInputs(defaultContentPlanInputs(next.inputs));
      setProjectLinks(null);
      setStep(4);
      setSection("brief");
      router.push(`/content-plans/${next.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not duplicate plan");
    } finally {
      setBusy(false);
    }
  }

  async function onDeletePlan(id: string, title: string) {
    const ok = window.confirm(
      `Delete “${title || "this plan"}”? This cannot be undone.\n\nLinked projects are not deleted.`
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await deleteContentPlan(getToken, id);
      if (plan?.id === id) {
        setPlan(null);
        setProjectLinks(null);
        setStep(1);
        setInputs(defaultContentPlanInputs());
        if (hideSavedPlans) {
          router.push("/content-plans");
          return;
        }
      }
      if (!hideSavedPlans) {
        const listed = await listContentPlans(getToken);
        setSavedPlans(listed.plans);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete plan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {hideSavedPlans ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/content-plans"
            className="inline-flex items-center text-sm font-medium text-sky-800 hover:underline"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All content plans
          </Link>
          {plan ? (
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void onClonePlan(plan.id)}
                title="Duplicate plan"
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                Duplicate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void onDeletePlan(plan.id, plan.title)}
                title="Delete plan"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
            <Clapperboard className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900">Content plan director</h3>
            <p className="mt-0.5 text-sm text-slate-600">
              Turn a simple idea into a production-ready blueprint — brief, beats, script, and
              executable shots with how-to-shoot instructions. Plans are saved to your account.
            </p>
            {progressLabel ? (
              <p className="mt-1 text-xs font-medium text-sky-800">{progressLabel}</p>
            ) : null}
          </div>
        </div>

        {step < 4 ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStep(n)}
                className={cn(
                  "rounded-full px-3 py-1 font-medium",
                  step === n ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                )}
              >
                {n === 1 ? "1 · Style" : n === 2 ? "2 · Idea" : "3 · Parameters"}
              </button>
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-4 space-y-3">
            <Field label="Content style">
              <Select
                value={inputs.contentStyle}
                onChange={(e) =>
                  patchInputs({ contentStyle: e.target.value as ContentPlanInputs["contentStyle"] })
                }
                options={CONTENT_STYLE_OPTIONS}
              />
            </Field>
            <p className="text-sm text-slate-600">
              Hybrid UGC + Cinematic is the recommended default: authentic performance with
              commercial inserts and intentional camera work.
            </p>
            <Button type="button" onClick={() => setStep(2)}>
              Next · Idea
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-4 space-y-3">
            <Field label="What do you want to create?">
              <textarea
                value={inputs.idea}
                onChange={(e) => patchInputs({ idea: e.target.value })}
                rows={6}
                placeholder='e.g. Create a 30-second hybrid UGC + cinematic ad. A creator comes home after a workout, opens the refrigerator, grabs a sparkling water…'
                className={textInputClassName()}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" onClick={() => setStep(3)} disabled={!inputs.idea.trim()}>
                Next · Parameters
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Duration">
                <Select
                  value={inputs.durationPreset}
                  onChange={(e) =>
                    patchInputs({
                      durationPreset: e.target.value as ContentPlanInputs["durationPreset"],
                    })
                  }
                  options={DURATION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
              </Field>
              {inputs.durationPreset === "custom" ? (
                <Field label="Custom seconds">
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={inputs.durationSeconds}
                    onChange={(e) =>
                      patchInputs({ durationSeconds: Number(e.target.value) || 30 })
                    }
                    className={textInputClassName()}
                  />
                </Field>
              ) : null}
              <Field label="Platform">
                <Select
                  value={inputs.platform}
                  onChange={(e) =>
                    patchInputs({ platform: e.target.value as ContentPlanInputs["platform"] })
                  }
                  options={PLATFORM_OPTIONS}
                />
              </Field>
              <Field label="Orientation">
                <Select
                  value={inputs.orientation}
                  onChange={(e) =>
                    patchInputs({
                      orientation: e.target.value as ContentPlanInputs["orientation"],
                    })
                  }
                  options={ORIENTATION_OPTIONS}
                />
              </Field>
              <Field label="Energy">
                <Select
                  value={inputs.energy}
                  onChange={(e) =>
                    patchInputs({ energy: e.target.value as ContentPlanInputs["energy"] })
                  }
                  options={ENERGY_OPTIONS}
                />
              </Field>
              <Field label="Dialogue">
                <Select
                  value={inputs.dialogueMode}
                  onChange={(e) =>
                    patchInputs({
                      dialogueMode: e.target.value as ContentPlanInputs["dialogueMode"],
                    })
                  }
                  options={DIALOGUE_OPTIONS}
                />
              </Field>
              <Field label="CTA">
                <Select
                  value={inputs.cta}
                  onChange={(e) =>
                    patchInputs({ cta: e.target.value as ContentPlanInputs["cta"] })
                  }
                  options={CTA_OPTIONS}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Brand (optional)">
                <input
                  value={inputs.brand || ""}
                  onChange={(e) => patchInputs({ brand: e.target.value })}
                  className={textInputClassName()}
                />
              </Field>
              <Field label="Product (optional)">
                <input
                  value={inputs.product || ""}
                  onChange={(e) => patchInputs({ product: e.target.value })}
                  className={textInputClassName()}
                />
              </Field>
              <Field label="Creator / talent (optional)" className="sm:col-span-2">
                {showCreatorCatalog ? (
                  <div className="space-y-2">
                    <Select
                      value={inputs.creatorId || ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) {
                          patchInputs({
                            creatorId: null,
                            creatorName: "",
                            creatorCatalogNotes: "",
                          });
                          return;
                        }
                        const c = creators.find((x) => x.id === id);
                        if (!c) return;
                        patchInputs({
                          creatorId: c.id,
                          creatorName: c.professionalName,
                          creatorCatalogNotes: creatorCatalogNotes(c),
                          wardrobe:
                            inputs.wardrobe?.trim() ||
                            c.primaryNiche ||
                            inputs.wardrobe,
                        });
                      }}
                      options={
                        creatorsLoading
                          ? [{ value: "", label: "Loading creators…" }]
                          : [
                              { value: "", label: "Select from creator catalog…" },
                              ...creators.map((c) => ({
                                value: c.id,
                                label: c.primaryNiche
                                  ? `${c.professionalName} · ${c.primaryNiche}`
                                  : c.professionalName,
                              })),
                            ]
                      }
                    />
                    <input
                      value={inputs.creatorName || ""}
                      onChange={(e) =>
                        patchInputs({
                          creatorName: e.target.value,
                          creatorId: e.target.value.trim() ? inputs.creatorId : null,
                          creatorCatalogNotes: e.target.value.trim()
                            ? inputs.creatorCatalogNotes
                            : "",
                        })
                      }
                      placeholder="Or type a talent name"
                      className={textInputClassName()}
                    />
                  </div>
                ) : (
                  <input
                    value={inputs.creatorName || ""}
                    onChange={(e) =>
                      patchInputs({
                        creatorName: e.target.value,
                        creatorId: null,
                        creatorCatalogNotes: "",
                      })
                    }
                    className={textInputClassName()}
                  />
                )}
              </Field>
              <Field label="Location (optional)" className="sm:col-span-2">
                <div className="space-y-2">
                  <Select
                    value={inputs.locationId || ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) {
                        patchInputs({
                          locationId: null,
                          location: "",
                          locationCatalogNotes: "",
                        });
                        return;
                      }
                      const loc = locationCatalog.find((x) => x.id === id);
                      if (!loc) return;
                      patchInputs({
                        locationId: loc.id,
                        location: formatLocationCatalogLabel(loc),
                        locationCatalogNotes: locationCatalogNotes(loc),
                      });
                    }}
                    options={
                      locationsLoading
                        ? [{ value: "", label: "Loading locations…" }]
                        : [
                            { value: "", label: "Select from location catalog…" },
                            ...locationCatalog.map((loc) => ({
                              value: loc.id,
                              label: formatLocationCatalogLabel(loc),
                            })),
                          ]
                    }
                  />
                  <input
                    value={inputs.location || ""}
                    onChange={(e) =>
                      patchInputs({
                        location: e.target.value,
                        locationId: e.target.value.trim() ? inputs.locationId : null,
                        locationCatalogNotes: e.target.value.trim()
                          ? inputs.locationCatalogNotes
                          : "",
                      })
                    }
                    placeholder="Or type a location"
                    className={textInputClassName()}
                  />
                </div>
              </Field>
              <Field label="Wardrobe (optional)" className="sm:col-span-2">
                <input
                  value={inputs.wardrobe || ""}
                  onChange={(e) => patchInputs({ wardrobe: e.target.value })}
                  placeholder="e.g. Athleisure, matching brand colors, no logos"
                  className={textInputClassName()}
                />
              </Field>
              <Field label="Cameras available" className="sm:col-span-2">
                <input
                  value={inputs.camerasAvailable || ""}
                  onChange={(e) => patchInputs({ camerasAvailable: e.target.value })}
                  placeholder="e.g. Sony FX3"
                  className={textInputClassName()}
                />
              </Field>
              <Field label="Lenses available" className="sm:col-span-2">
                <input
                  value={inputs.lensesAvailable || ""}
                  onChange={(e) => patchInputs({ lensesAvailable: e.target.value })}
                  placeholder="e.g. 24mm, 35mm, 50mm"
                  className={textInputClassName()}
                />
              </Field>
              <Field label="Lights available" className="sm:col-span-2">
                <input
                  value={inputs.lightingAvailable || ""}
                  onChange={(e) => patchInputs({ lightingAvailable: e.target.value })}
                  placeholder="e.g. Aputure 300d, tube lights, practicals"
                  className={textInputClassName()}
                />
              </Field>
              <Field label="Other gear (support / grip / audio)" className="sm:col-span-2">
                <input
                  value={inputs.equipmentAvailable || ""}
                  onChange={(e) => patchInputs({ equipmentAvailable: e.target.value })}
                  placeholder="e.g. Tripod, gimbal, boom, lavs"
                  className={textInputClassName()}
                />
              </Field>
              <div className="sm:col-span-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Load kit from project board
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[200px] flex-1">
                    <Select
                      value={kitProjectId}
                      onChange={(e) => setKitProjectId(e.target.value)}
                      options={
                        projectsLoading
                          ? [{ value: "", label: "Loading projects…" }]
                          : [
                              { value: "", label: "Select a project…" },
                              ...projects.map((p) => ({
                                value: p.id,
                                label: p.projectName || p.id,
                              })),
                            ]
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={kitBusy || !kitProjectId}
                    onClick={() => void loadKitFromProject()}
                  >
                    {kitBusy ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      "Fill from board kit"
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Generation uses these lists (and a linked project’s board kit) when “Use available
                  gear only” is on.
                  {inputs.camerasAvailable || inputs.lensesAvailable || inputs.lightingAvailable
                    ? ` Listed: ${flattenShootingKit(
                        normalizeShootingKit({
                          cameraBodies: (inputs.camerasAvailable || "")
                            .split(/[,;\n]+/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                          lenses: (inputs.lensesAvailable || "")
                            .split(/[,;\n]+/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                          lights: (inputs.lightingAvailable || "")
                            .split(/[,;\n]+/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                          other: (inputs.equipmentAvailable || "")
                            .split(/[,;\n]+/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                          supports: [],
                          grip: [],
                          audio: [],
                          props: [],
                        })
                      ).length} items.`
                    : ""}
                </p>
              </div>
              <Field label="Talking points / required phrases" className="sm:col-span-2">
                <textarea
                  value={inputs.talkingPoints || ""}
                  onChange={(e) => patchInputs({ talkingPoints: e.target.value })}
                  rows={2}
                  className={textInputClassName()}
                />
              </Field>
              <Field label="Things to avoid" className="sm:col-span-2">
                <textarea
                  value={inputs.avoid || ""}
                  onChange={(e) => patchInputs({ avoid: e.target.value })}
                  rows={2}
                  className={textInputClassName()}
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputs.useAvailableGearOnly}
                  onChange={(e) => patchInputs({ useAvailableGearOnly: e.target.checked })}
                />
                Use available gear only
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputs.teachMe}
                  onChange={(e) => patchInputs({ teachMe: e.target.checked })}
                />
                Teach me mode
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="button" onClick={() => void onGenerate()} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Building plan (multi-pass — can take a minute)…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Generate production plan
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 4 && plan ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-1.5 sm:max-w-xl">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Plan title
              </label>
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => void onSaveTitle()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                disabled={saving || busy}
                className={textInputClassName()}
                placeholder="Working title"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setStep(3)}>
                Edit inputs
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void regenerate("phase1")}
                disabled={busy}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Regenerate Phase 1
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void regenerate("phase2")}
                disabled={busy || !plan.shots?.length}
              >
                Generate Phase 2
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void regenerate("phase3")}
                disabled={busy || !plan.shots?.length}
              >
                Generate Phase 3
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setSection("davinci")}
                disabled={!plan.shots?.length}
              >
                Shoot Mode
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void onCreateProject()}
                disabled={
                  creatingProject ||
                  busy ||
                  !plan.shots?.length ||
                  Boolean(plan.projectId || projectLinks?.projectId)
                }
              >
                {creatingProject ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Creating project…
                  </>
                ) : (
                  <>
                    <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                    Create project from plan
                  </>
                )}
              </Button>
              <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving}>
                {savedFlash ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {saving ? "Saving…" : "Save plan"}
                  </>
                )}
              </Button>
              <label className="ml-auto inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={teachMe}
                  onChange={(e) => {
                    patchInputs({ teachMe: e.target.checked });
                    if (plan) {
                      void updateContentPlan(getToken, plan.id, {
                        teachMe: e.target.checked,
                      }).then(({ plan: next }) => setPlan(next));
                    }
                  }}
                />
                Teach me
              </label>
            </div>
            <p className="text-sm text-slate-600">
              Status: <span className="font-medium text-slate-900">{plan.status}</span>
              {plan.lastError ? ` — ${plan.lastError}` : null}
            </p>
            {(plan.projectId || projectLinks?.projectId) && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-sm text-emerald-950">
                <p className="font-medium">Linked to ShootSpine project</p>
                <p className="mt-0.5 text-xs text-emerald-900/80">
                  After refine or regenerate, update the project so the board and AI Editor stay in
                  sync. Board shot IDs are kept when shot numbers match.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={syncingProject || busy || !plan.shots?.length}
                    onClick={() => void onSyncLinkedProject()}
                  >
                    {syncingProject ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Updating project…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Update linked project
                      </>
                    )}
                  </Button>
                  <Link
                    href={`/projects/${plan.projectId || projectLinks?.projectId}`}
                    className="text-sm font-medium text-sky-800 hover:underline"
                  >
                    Open project
                  </Link>
                  <Link
                    href={`/projects/${plan.projectId || projectLinks?.projectId}/production`}
                    className="text-sm font-medium text-sky-800 hover:underline"
                  >
                    Production board
                  </Link>
                  <Link
                    href={`/projects/${plan.projectId || projectLinks?.projectId}/ai-editor`}
                    className="text-sm font-medium text-sky-800 hover:underline"
                  >
                    AI Editor
                  </Link>
                  {(plan.scriptSessionId || projectLinks?.scriptSessionId) && (
                    <Link
                      href={`/script-writer/${plan.scriptSessionId || projectLinks?.scriptSessionId}`}
                      className="text-sm font-medium text-sky-800 hover:underline"
                    >
                      Script session
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
      </div>

      {step === 4 && plan ? (
        <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-2">
            <nav className="flex gap-1 overflow-x-auto lg:flex-col">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={!s.ready}
                  onClick={() => s.ready && setSection(s.id)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-left text-sm whitespace-nowrap",
                    section === s.id
                      ? "bg-slate-900 text-white"
                      : s.ready
                        ? "text-slate-700 hover:bg-slate-50"
                        : "cursor-not-allowed text-slate-400"
                  )}
                >
                  {s.label}
                  {!s.ready ? " · soon" : null}
                </button>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <CompletionBar plan={plan} />
            <Phase2SummaryActions
              plan={plan}
              busy={busy}
              onRegen={(s) => void regenerate(s)}
            />
            <Phase3SummaryActions
              plan={plan}
              busy={busy}
              onRegen={(s) => void regenerate(s)}
            />
            <ContentPlanPhase5Bar
              plan={plan}
              section={section}
              getToken={getToken}
              onError={setError}
              onPlanUpdated={(next, links) => {
                setPlan(next);
                if (links) setProjectLinks(links);
                else if (next.projectId) {
                  setProjectLinks({
                    projectId: next.projectId,
                    scriptSessionId: next.scriptSessionId || "",
                  });
                }
              }}
            />

            {section === "brief" && plan.creativeBrief ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-lg font-semibold text-slate-900">
                    {plan.creativeBrief.workingTitle || plan.title}
                  </h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void regenerate("brief")}
                  >
                    Regenerate
                  </Button>
                </div>
                {(
                  [
                    ["Hook", plan.creativeBrief.hook],
                    ["Core concept", plan.creativeBrief.coreConcept],
                    ["Objective", plan.creativeBrief.objective],
                    ["Target viewer", plan.creativeBrief.targetViewer],
                    ["Main message", plan.creativeBrief.mainMessage],
                    ["Emotional goal", plan.creativeBrief.emotionalGoal],
                    ["Product / brand moment", plan.creativeBrief.productBrandMoment],
                    ["CTA", plan.creativeBrief.cta],
                    ["Visual style", plan.creativeBrief.visualStyle],
                    ["Camera philosophy", plan.creativeBrief.cameraPhilosophy],
                    ["Editing philosophy", plan.creativeBrief.editingPhilosophy],
                    ["Sound philosophy", plan.creativeBrief.soundPhilosophy],
                    ["Why this works", plan.creativeBrief.whyItWorks],
                  ] as const
                ).map(([label, value]) => (
                  <Block key={label} title={label} body={value} />
                ))}
              </div>
            ) : null}

            {section === "beats" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-slate-900">Story beat sheet</h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void regenerate("beats")}
                  >
                    Regenerate
                  </Button>
                </div>
                <ol className="space-y-2">
                  {(plan.beats || []).map((b) => (
                    <li
                      key={b.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                        {b.startTime}–{b.endTime} · {b.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-800">{b.description}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {section === "script" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-slate-900">Script</h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void regenerate("script")}
                  >
                    Regenerate
                  </Button>
                </div>
                <div className="space-y-3">
                  {(plan.scriptLines || []).map((line) => (
                    <div
                      key={line.id}
                      className="rounded-xl border border-slate-100 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className="font-semibold uppercase tracking-wide text-slate-900">
                          {line.speaker}
                        </p>
                        {line.timing ? (
                          <span className="text-xs text-slate-500">{line.timing}</span>
                        ) : null}
                        {line.kind ? (
                          <span className="text-[11px] text-slate-500">{line.kind}</span>
                        ) : null}
                      </div>
                      {line.dialogue ? (
                        <p className="mt-1 text-sm text-slate-800">&ldquo;{line.dialogue}&rdquo;</p>
                      ) : null}
                      {line.onScreenText ? (
                        <p className="mt-1 text-sm text-slate-600">
                          On-screen: {line.onScreenText}
                        </p>
                      ) : null}
                      {line.delivery ? (
                        <p className="mt-1 text-xs text-slate-500">Delivery: {line.delivery}</p>
                      ) : null}
                    </div>
                  ))}
                  {!plan.scriptLines?.length ? (
                    <p className="text-sm text-slate-600">No dialogue lines for this plan.</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {section === "shots" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-slate-900">
                    Shot list · {plan.shots?.length || 0}
                  </h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void regenerate("shots")}
                  >
                    Regenerate
                  </Button>
                </div>
                <div className="space-y-3">
                  {(plan.shots || []).map((shot, i) => (
                    <ShotCard
                      key={shot.id}
                      shot={shot}
                      teachMe={teachMe}
                      defaultOpen={i === 0}
                      userId={user?.uid}
                      planId={plan.id}
                      onPatch={(shotId, partial) => void onPatchShot(shotId, partial)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {section === "edit" ? (
              <EditMapPanel
                editPlan={plan.editPlan}
                davinci={plan.davinciBlueprint}
                teachMe={teachMe}
                busy={busy}
                onRegen={(s) => void regenerate(s)}
                onUpdateEditPlan={(editPlan) => {
                  setPlan((p) => (p ? { ...p, editPlan } : p));
                  void updateContentPlan(getToken, plan.id, { editPlan })
                    .then(({ plan: next }) => setPlan(next))
                    .catch((e) =>
                      setError(
                        e instanceof Error ? e.message : "Could not update edit map"
                      )
                    );
                }}
              />
            ) : null}
            {section === "sound" ? (
              <SoundPanel
                soundPlan={plan.soundPlan}
                busy={busy}
                onRegen={(s) => void regenerate(s)}
              />
            ) : null}
            {section === "music" ? (
              <MusicPanel
                musicPlan={plan.musicPlan}
                busy={busy}
                onRegen={(s) => void regenerate(s)}
              />
            ) : null}
            {section === "look" ? (
              <LookPanel
                colorPlan={plan.colorPlan}
                busy={busy}
                onRegen={(s) => void regenerate(s)}
              />
            ) : null}
            {section === "lighting" ? (
              <LightingPanel
                lightingPlan={plan.lightingPlan}
                teachMe={teachMe}
                busy={busy}
                onRegen={(s) => void regenerate(s)}
              />
            ) : null}

            {section === "coverage" ? (
              <CoveragePanel
                coveragePlan={plan.coveragePlan}
                busy={busy}
                onRegen={(s) => void regenerate(s)}
                onUpdate={(coveragePlan) => {
                  setPlan((p) => (p ? { ...p, coveragePlan } : p));
                  void updateContentPlan(getToken, plan.id, { coveragePlan });
                }}
              />
            ) : null}
            {section === "shoot_order" ? (
              <ShootOrderPanel
                shootOrderPlan={plan.shootOrderPlan}
                busy={busy}
                onRegen={(s) => void regenerate(s)}
              />
            ) : null}
            {section === "checklist" ? (
              <ChecklistPanel
                checklist={plan.checklist}
                busy={busy}
                onRegen={(s) => void regenerate(s)}
                onUpdate={(checklist) => {
                  setPlan((p) => (p ? { ...p, checklist } : p));
                  void updateContentPlan(getToken, plan.id, { checklist });
                }}
              />
            ) : null}
            {section === "davinci" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5">
                  <p className="text-sm text-slate-700">
                    Open full-screen Shoot Mode on your phone or iPad for on-set tracking.
                  </p>
                  <Link
                    href={`/content-plans/${plan.id}/shoot`}
                    className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Open Shoot Mode
                  </Link>
                </div>
                <ShootModePanel
                  plan={plan}
                  onUpdateShots={(shots) => {
                    setPlan((p) => (p ? { ...p, shots } : p));
                    void updateContentPlan(getToken, plan.id, { shots });
                  }}
                />
              </div>
            ) : null}
          </main>
        </div>
      ) : null}

      {!hideSavedPlans && savedPlans.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900">Saved plans</h4>
            <Link
              href="/content-plans"
              className="text-xs font-medium text-sky-800 hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-slate-100">
            {savedPlans.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{p.title}</p>
                  <p className="text-xs text-slate-500">
                    {p.status}
                    {p.inputs?.contentStyle ? ` · ${p.inputs.contentStyle}` : ""}
                    {p.shots?.length ? ` · ${p.shots.length} shots` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <Link href={`/content-plans/${p.id}`}>
                    <Button type="button" size="sm" variant="secondary" disabled={busy}>
                      Open
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void onClonePlan(p.id)}
                    title="Duplicate plan"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void onDeletePlan(p.id, p.title)}
                    title="Delete plan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
