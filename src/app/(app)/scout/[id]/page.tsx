"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, Sparkles, Film, List, ImageIcon, FileDown, RefreshCw, ScrollText, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScoutShell, ScoutCard, ScoutScoreBadge } from "@/components/scout/ScoutShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  getScoutProject,
  getScoutProjectImages,
} from "@/lib/firebase/scoutFirestore";
import {
  getProductionBoardByProject,
  saveProductionBoard,
} from "@/lib/firebase/productionFirestore";
import { ProductionShotListEditor } from "@/components/production/ProductionShotListEditor";
import { scoutShotsFromProductionList } from "@/lib/production/shotListSync";
import { ProductionBoard, ProductionDayShot } from "@/lib/production/types";
import { uploadScoutImage } from "@/lib/scout/storage";
import {
  scoutAnalyze,
  scoutGenerateDpPlan,
  scoutGeneratePreview,
  scoutGenerateShotList,
  scoutRegisterImage,
  scoutSaveShotList,
  scoutTechniqueLookup,
} from "@/lib/scout/apiClient";
import {
  SCOUT_IMAGE_LABELS,
  SCOUT_MAX_UPLOADS,
  MOOD_LABEL,
  SCENE_TYPE_LABEL,
  SCOUT_STATUS_LABEL,
} from "@/lib/scout/constants";
import { ScoutImageLabel, ScoutProject, ScoutProjectImage } from "@/lib/scout/types";
import { canLinkScoutToProject, canUseShotScout } from "@/lib/utils/permissions";
import { downloadScoutPdf } from "@/lib/pdf/generateScoutPdf";
import { LightingAssignmentTable } from "@/components/scout/LightingAssignmentTable";
import { ScoutShotListEditor } from "@/components/scout/ScoutShotListEditor";
import { ScoutVersionHistory } from "@/components/scout/ScoutVersionHistory";
import { ScoutLinkToProjectCard } from "@/components/scout/ScoutLinkToProjectCard";
import { useConditionalCollection } from "@/hooks/useConditionalCollection";
import { Project } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { scoutWorkflowSteps } from "@/lib/scout/scoutWorkflow";
import { SharedNotesPanel } from "@/components/sharedNotes/SharedNotesPanel";

function formatPlanValue(v: string | string[] | undefined): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.length ? v.join(" · ") : "—";
  return v;
}

type Tab = "upload" | "analysis" | "plan" | "shots" | "preview" | "export";

export default function ScoutProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const adminOpen = searchParams.get("adminOpen") === "1";
  const id = params.id as string;
  const { user, appUser } = useAuth();
  const canLinkProjects = canLinkScoutToProject(appUser);
  const { data: productionProjects } = useConditionalCollection<Project>("projects", canLinkProjects);
  const [project, setProject] = useState<ScoutProject | null>(null);
  const [images, setImages] = useState<ScoutProjectImage[]>([]);
  const [tab, setTab] = useState<Tab>("upload");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [techniqueQuery, setTechniqueQuery] = useState("");
  const [techniqueLoading, setTechniqueLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState<ScoutImageLabel>("unlabeled");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [productionBoard, setProductionBoard] = useState<ProductionBoard | null>(null);
  const [shotListSaving, setShotListSaving] = useState(false);
  const shotListSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const p = await getScoutProject(id);
    setProject(p);
    const imgs = await getScoutProjectImages(id);
    setImages(imgs);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const projectId = project?.linkedProjectId?.trim();
    if (!projectId) {
      setProductionBoard(null);
      return;
    }
    getProductionBoardByProject(projectId)
      .then(setProductionBoard)
      .catch(() => setProductionBoard(null));
  }, [project?.linkedProjectId]);

  const productionDayShots = useMemo(
    () => productionBoard?.productionDays[0]?.shots ?? [],
    [productionBoard]
  );

  const isLinkedToProject = Boolean(project?.linkedProjectId?.trim());

  const persistLinkedProductionShots = useCallback(
    (nextShots: ProductionDayShot[]) => {
      if (!productionBoard) return;
      const dayIndex = 0;
      const nextDays = productionBoard.productionDays.map((d, index) =>
        index === dayIndex ? { ...d, shots: nextShots } : d
      );
      const nextBoard = { ...productionBoard, productionDays: nextDays };
      setProductionBoard(nextBoard);
      if (shotListSaveTimer.current) clearTimeout(shotListSaveTimer.current);
      shotListSaveTimer.current = setTimeout(() => {
        void (async () => {
          setShotListSaving(true);
          try {
            const { id: boardId, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } =
              nextBoard;
            await saveProductionBoard(boardId, rest);
            await scoutSaveShotList(id, scoutShotsFromProductionList(nextShots));
          } finally {
            setShotListSaving(false);
          }
        })();
      }, 600);
    },
    [productionBoard, id]
  );

  const handleScoutShotListSaved = useCallback(async () => {
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (!adminOpen || !user) return;
    void (async () => {
      try {
        const token = await user.getIdToken();
        await fetch("/api/admin/workspace-open", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ resourceType: "scout", resourceId: id }),
        });
        await refresh();
      } catch {
        /* refresh will surface permission errors */
      }
    })();
  }, [adminOpen, user, id, refresh]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !user?.uid || !project || adminReadOnly) return;
    if (images.length >= SCOUT_MAX_UPLOADS) {
      setError(`Maximum ${SCOUT_MAX_UPLOADS} photos per session.`);
      return;
    }
    setError(null);
    const file = files[0];
    const imageId = crypto.randomUUID();
    setBusy("upload");
    setUploadProgress(0);
    try {
      const { storagePath, storageUrl } = await uploadScoutImage(
        user.uid,
        id,
        imageId,
        file,
        setUploadProgress
      );
      await scoutRegisterImage(id, {
        imageId,
        storagePath,
        storageUrl,
        label: uploadLabel,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
      setUploadProgress(null);
    }
  };

  const runAnalyze = async () => {
    setBusy("analyze");
    setError(null);
    try {
      await scoutAnalyze(id);
      await refresh();
      setTab("analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(null);
    }
  };

  const runDpPlan = async () => {
    setBusy("dp");
    setError(null);
    try {
      await scoutGenerateDpPlan(id);
      await refresh();
      setTab("plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "DP plan failed");
    } finally {
      setBusy(null);
    }
  };

  const runShotList = async () => {
    setBusy("shots");
    setError(null);
    try {
      await scoutGenerateShotList(id);
      await refresh();
      setTab("shots");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shot list failed");
    } finally {
      setBusy(null);
    }
  };

  const runPreview = async (generateImages = false) => {
    setBusy(generateImages ? "preview-images" : "preview");
    setError(null);
    try {
      const result = await scoutGeneratePreview(id, { generateImages });
      await refresh();
      setTab("preview");
      const warnings = Array.isArray(result.warnings) ? (result.warnings as string[]) : [];
      if (warnings.length) {
        setError(
          `${generateImages ? "Some images failed" : "Previs saved with warnings"}: ${warnings.slice(0, 2).join(" · ")}${
            warnings.length > 2 ? ` (+${warnings.length - 2} more)` : ""
          }`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(null);
    }
  };

  const confirmRegenerate = (label: string) =>
    confirm(`Regenerate ${label}? This replaces the current version.`);

  const runRegenerateAll = async () => {
    if (
      !confirm(
        isLinkedToProject
          ? "Regenerate analysis (if needed) and DP plan from your current photos and settings?\n\nYour project shot list is unchanged — edit it on the project board or Scout shot list tab."
          : "Regenerate analysis (if needed), DP plan, and shot list from your current photos and settings?\n\nPrevis images are not included — use Previs tab if you want prompts or images."
      )
    ) {
      return;
    }
    setBusy("all");
    setError(null);
    try {
      if (!analysis) await scoutAnalyze(id);
      await scoutGenerateDpPlan(id);
      if (!isLinkedToProject) {
        await scoutGenerateShotList(id);
      }
      await refresh();
      setTab(isLinkedToProject ? "plan" : "shots");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setBusy(null);
    }
  };

  const runTechniqueLookup = async () => {
    if (techniqueLoading) return;
    setTechniqueLoading(true);
    setError(null);
    try {
      const { project: updated } = await scoutTechniqueLookup(id, techniqueQuery.trim() || undefined);
      setProject(updated as ScoutProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Technique lookup failed");
    } finally {
      setTechniqueLoading(false);
    }
  };

  if (!canUseShotScout(appUser)) {
    return <div className="py-20 text-center text-slate-500">No access to Shot Scout.</div>;
  }

  if (loading) return <LoadingSpinner className="py-20" />;
  if (!project) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">Session not found.</p>
        <Link href="/scout" className="mt-4 text-sky-600 hover:underline">
          Back
        </Link>
      </div>
    );
  }

  const analysis = project.latestAnalysis;
  const dp = project.latestDpPlan;
  const previews = project.latestPreviews ?? [];
  const hasShotList = isLinkedToProject
    ? productionDayShots.length > 0
    : (project?.latestShotList?.shots?.length ?? 0) > 0;
  const standaloneScoutShots = project?.latestShotList?.shots ?? [];
  const workflowSteps = scoutWorkflowSteps(id, project, images.length);
  const isBeginner = project.skillLevel === "beginner";
  const adminReadOnly = adminOpen && !!user && project.userId !== user.uid;

  const tabs: { id: Tab; label: string; icon: typeof Camera }[] = [
    { id: "upload", label: "Photos", icon: Camera },
    { id: "analysis", label: "Analysis", icon: Sparkles },
    { id: "plan", label: "DP plan", icon: Film },
    { id: "shots", label: "Shot list", icon: List },
    { id: "preview", label: "Previs", icon: ImageIcon },
    { id: "export", label: "Export", icon: FileDown },
  ];

  return (
    <ScoutShell>
      <div className="mx-auto max-w-5xl px-4 pb-24">
        <Link href="/scout" className="mb-4 inline-flex items-center text-sm text-sky-600 hover:text-sky-800">
          <ArrowLeft className="mr-1 h-4 w-4" />
          All sessions
        </Link>

        {adminReadOnly && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Viewing as admin (read-only). This access is logged. You cannot edit this private scout
            session.
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <Link href={`/scout/${id}/edit`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sky-700 hover:border-sky-300 hover:bg-sky-50">
            Edit session
          </Link>
          <Link href={`/scout/${id}/questions`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sky-700 hover:border-sky-300 hover:bg-sky-50">
            Creative Q&A
          </Link>
          <Link href={`/scout/${id}/lighting`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sky-700 hover:border-sky-300 hover:bg-sky-50">
            Scene lights
          </Link>
          <Link href={`/scout/${id}/export`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sky-700 hover:border-sky-300 hover:bg-sky-50">
            Export
          </Link>
          <Link
            href={`/script-writer?${new URLSearchParams({
              idea: project.sceneIdea,
              title: project.projectName,
              ...(project.linkedProjectId ? { projectId: project.linkedProjectId } : {}),
              scoutId: id,
            }).toString()}`}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-800 hover:border-violet-300 hover:bg-violet-100"
          >
            <ScrollText className="mr-1 inline h-3.5 w-3.5" />
            Write full script
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.projectName}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {SCENE_TYPE_LABEL[project.sceneType]} · {MOOD_LABEL[project.mood]} ·{" "}
              {SCOUT_STATUS_LABEL[project.status]}
            </p>
            {project.linkedProjectName && (
              <Link
                href={`/projects/${project.linkedProjectId}`}
                className="text-xs text-sky-600 hover:underline"
              >
                Linked project: {project.linkedProjectName}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {images.length > 0 && !analysis && (
              <Button size="sm" disabled={!!busy} onClick={() => void runAnalyze()}>
                {busy === "analyze" ? "Analyzing…" : "Analyze location"}
              </Button>
            )}
            {analysis && !dp && (
              <Button size="sm" disabled={!!busy} onClick={() => void runDpPlan()}>
                {busy === "dp" ? "Building…" : "Generate DP plan"}
              </Button>
            )}
            {dp && (
              <Button
                size="sm"
                variant="outline"
                disabled={!!busy}
                onClick={() => void runRegenerateAll()}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {busy === "all" ? "Regenerating…" : "Regenerate plan & shots"}
              </Button>
            )}
          </div>
        </div>

        <ScoutCard className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Session progress</p>
          <div className="flex flex-wrap gap-2">
            {workflowSteps.map((step) =>
              step.href ? (
                <Link
                  key={step.id}
                  href={step.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
                    step.done
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      : "bg-white text-slate-600 ring-slate-200 hover:ring-sky-300"
                  )}
                >
                  {step.done ? "✓ " : ""}
                  {step.label}
                </Link>
              ) : (
                <span
                  key={step.id}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium ring-1",
                    step.done
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      : "bg-slate-50 text-slate-500 ring-slate-200"
                  )}
                >
                  {step.done ? "✓ " : ""}
                  {step.label}
                </span>
              )
            )}
          </div>
        </ScoutCard>

        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white/90 p-1 shadow-sm">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                  tab === t.id
                    ? "bg-gradient-to-r from-sky-400 to-sky-500 text-white shadow-md shadow-sky-500/20"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {canLinkProjects && productionProjects.length > 0 && (
          <div className="mb-6">
            <ScoutLinkToProjectCard
              scoutSession={project}
              projects={productionProjects}
              onUpdated={() => void refresh()}
            />
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-6">
            <ScoutCard>
              <p className="mb-4 text-sm text-slate-600">
                Stand in the room and take photos from each corner, plus one wide photo from the doorway
                and one of the main background. Capture windows, lamps, ceiling lights, and practical
                sources. Upload 3–6 images.
              </p>
              <Select
                label="Photo label"
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value as ScoutImageLabel)}
                options={SCOUT_IMAGE_LABELS}
                touch
              />
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/30 px-6 py-10 hover:border-sky-400">
                <Camera className="mb-2 h-10 w-10 text-sky-400" />
                <span className="text-sm font-medium text-slate-700">Tap to add photo</span>
                <span className="mt-1 text-xs text-slate-500">
                  {images.length}/{SCOUT_MAX_UPLOADS} uploaded
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={!!busy || images.length >= SCOUT_MAX_UPLOADS}
                  onChange={(e) => void handleUpload(e.target.files)}
                />
              </label>
              {uploadProgress != null && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-sky-500 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </ScoutCard>

            {images.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((img) => (
                  <ScoutCard key={img.id} className="overflow-hidden p-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.storageUrl} alt="" className="aspect-video w-full object-cover" />
                    <div className="flex items-center justify-between p-3">
                      <span className="text-xs text-slate-600 capitalize">
                        {img.label.replace(/_/g, " ")}
                      </span>
                      {img.aiScore != null && <ScoutScoreBadge score={img.aiScore} />}
                    </div>
                  </ScoutCard>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "analysis" && analysis && (
          <div className="space-y-6">
            <ScoutCard>
              <h2 className="text-lg font-semibold text-slate-900">Best angle</h2>
              <p className="mt-2 text-sm text-slate-700">{analysis.bestAngle.reasonBestAngle}</p>
              <p className="mt-3 text-xs font-medium text-sky-700">Camera position</p>
              <p className="text-sm text-slate-600">{analysis.bestAngle.recommendedCameraPosition}</p>
              <p className="mt-2 text-xs font-medium text-sky-700">Subject position</p>
              <p className="text-sm text-slate-600">{analysis.bestAngle.recommendedSubjectPosition}</p>
            </ScoutCard>

            <ScoutCard>
              <h3 className="font-semibold text-slate-900">Background & lighting</h3>
              <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
                {analysis.bestAngle.recommendedBackgroundChanges.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-slate-700">{analysis.bestAngle.recommendedLightingMotivation}</p>
            </ScoutCard>

            <div className="grid gap-4 sm:grid-cols-2">
              {analysis.perImage.map((row) => {
                const img = images.find((i) => i.id === row.imageId);
                return (
                  <ScoutCard key={row.imageId}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900 capitalize">{row.roomType}</span>
                      <ScoutScoreBadge score={row.score} />
                    </div>
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.storageUrl} alt="" className="mt-2 aspect-video rounded-lg object-cover" />
                    )}
                    <p className="mt-2 text-xs text-emerald-700">{row.strengths.join(" · ")}</p>
                    <p className="mt-1 text-xs text-amber-700">{row.weaknesses.join(" · ")}</p>
                  </ScoutCard>
                );
              })}
            </div>

            {!dp && analysis.missingQuestions.length > 0 && (
              <ScoutCard className="border-amber-200 bg-amber-50/50">
                <h3 className="font-semibold text-amber-900">Answer before DP plan</h3>
                <ul className="mt-2 list-inside list-disc text-sm text-amber-800">
                  {analysis.missingQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
                <Link href={`/scout/${id}/questions`} className="mt-3 inline-block text-sm text-sky-600 hover:underline">
                  Open creative questions →
                </Link>
              </ScoutCard>
            )}

            {!dp && (
              <Button onClick={() => void runDpPlan()} disabled={!!busy}>
                Generate full DP plan →
              </Button>
            )}

            {analysis && (
              <Button
                variant="outline"
                disabled={!!busy}
                onClick={() => {
                  if (!confirmRegenerate("location analysis")) return;
                  void runAnalyze();
                }}
              >
                {busy === "analyze" ? "Re-analyzing…" : "Re-analyze location"}
              </Button>
            )}

            <ScoutVersionHistory scoutId={id} kind="analysis" onRestored={() => void refresh()} />
          </div>
        )}

        {tab === "plan" && dp && (
          <div className="space-y-6">
            <ScoutCard className="border-sky-200/80 bg-sky-50/30">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                    <Globe className="h-4 w-4 text-sky-600" />
                    Technique lookup
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Tavily searches the web; Gemini summarizes techniques for your gear and this scene.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={techniqueQuery}
                  onChange={(e) => setTechniqueQuery(e.target.value)}
                  placeholder="Optional: e.g. interview backlight with FX3 and Aputure 600d"
                  className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={techniqueLoading}
                  onClick={() => void runTechniqueLookup()}
                >
                  {techniqueLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4" />
                  )}
                  Look up techniques
                </Button>
              </div>
              {project.latestTechniqueLookup ? (
                <div className="mt-4 space-y-3 border-t border-sky-100 pt-4 text-sm text-slate-700">
                  <p>{project.latestTechniqueLookup.summary}</p>
                  {project.latestTechniqueLookup.techniques.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Techniques</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {project.latestTechniqueLookup.techniques.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {project.latestTechniqueLookup.gearTips.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Gear tips</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {project.latestTechniqueLookup.gearTips.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </ScoutCard>

            {isBeginner && (
              <ScoutCard className="border-sky-200 bg-sky-50/50">
                <p className="text-sm text-sky-900">{dp.beginnerExplanation}</p>
              </ScoutCard>
            )}

            {!isBeginner && dp.proNotes && (
              <ScoutCard>
                <p className="text-sm text-slate-700">{dp.proNotes}</p>
              </ScoutCard>
            )}

            {dp.onSetWorkflow?.length > 0 && (
              <ScoutCard>
                <h2 className="font-semibold text-slate-900">On-set workflow</h2>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                  {dp.onSetWorkflow.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </ScoutCard>
            )}

            <ScoutCard>
              <h2 className="font-semibold text-slate-900">Camera settings</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries(dp.cameraSettings).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase text-slate-500">{k.replace(/([A-Z])/g, " $1")}</dt>
                    <dd className="text-slate-700">{v}</dd>
                  </div>
                ))}
              </dl>
            </ScoutCard>

            <ScoutCard>
              <h2 className="font-semibold text-slate-900">Lighting</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {Object.entries(dp.lightingPlan).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase text-slate-500">{k.replace(/([A-Z])/g, " $1")}</dt>
                    <dd className="text-slate-700">{formatPlanValue(v as string | string[])}</dd>
                  </div>
                ))}
              </dl>
            </ScoutCard>

            {dp.fixtureAwareLighting && (
              <div>
                <h2 className="mb-3 font-semibold text-slate-900">Fixture assignment</h2>
                <LightingAssignmentTable plan={dp.fixtureAwareLighting} showBeginner={isBeginner} />
              </div>
            )}

            <ScoutCard>
              <h2 className="font-semibold text-slate-900">Blocking</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {Object.entries(dp.blockingPlan).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase text-slate-500">{k.replace(/([A-Z])/g, " $1")}</dt>
                    <dd className="text-slate-700">{v}</dd>
                  </div>
                ))}
              </dl>
            </ScoutCard>

            {!hasShotList && (
              <Button onClick={() => void runShotList()} disabled={!!busy}>
                Generate shot list →
              </Button>
            )}

            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                if (!confirmRegenerate("DP plan")) return;
                void runDpPlan();
              }}
            >
              {busy === "dp" ? "Regenerating…" : "Regenerate DP plan"}
            </Button>

            <ScoutVersionHistory scoutId={id} kind="dpPlans" onRestored={() => void refresh()} />
          </div>
        )}

        {tab === "shots" && hasShotList && (
          <ScoutCard className="overflow-x-auto p-0">
            {isLinkedToProject && productionBoard ? (
              <div className="p-4">
                {shotListSaving ? (
                  <p className="mb-3 text-xs text-slate-500">Saving shot list…</p>
                ) : null}
                <ProductionShotListEditor
                  className="border-0 bg-transparent p-0 shadow-none scroll-mt-0"
                  shots={productionDayShots}
                  onChange={persistLinkedProductionShots}
                />
              </div>
            ) : (
              <div className="p-4">
                <ScoutShotListEditor
                  scoutId={id}
                  scoutProject={project}
                  shots={standaloneScoutShots}
                  onSaved={handleScoutShotListSaved}
                />
              </div>
            )}
            {!isLinkedToProject ? (
              <ScoutVersionHistory scoutId={id} kind="shotLists" onRestored={() => void refresh()} />
            ) : null}
            {!previews.length && (
              <div className="p-4 border-t border-slate-100 space-y-3">
                <p className="text-xs text-slate-500">
                  Save lighting-diagram and scene-view prompts for the crew (no image generation cost).
                  AI images are optional below.
                </p>
                <Button onClick={() => void runPreview(false)} disabled={!!busy}>
                  {busy === "preview" ? "Saving prompts…" : "Save previs prompts →"}
                </Button>
              </div>
            )}
            {!isLinkedToProject ? (
              <div className="border-t border-slate-100 p-4">
                <Button
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => {
                    if (!confirmRegenerate("shot list")) return;
                    void runShotList();
                  }}
                >
                  {busy === "shots" ? "Regenerating…" : "Regenerate shot list"}
                </Button>
              </div>
            ) : null}
          </ScoutCard>
        )}

        {tab === "preview" && (
          <div className="space-y-6">
            {previews.length === 0 ? (
              <ScoutCard className="space-y-4">
                <p className="text-sm text-slate-600">
                  Save written previs prompts for the lighting diagram and overall scene views — useful
                  for the crew without generating AI images.
                </p>
                <Button onClick={() => void runPreview(false)} disabled={!!busy || !dp}>
                  {busy === "preview" ? "Saving prompts…" : "Save previs prompts"}
                </Button>
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3">
                  <p className="text-sm font-medium text-amber-950">Optional: AI images</p>
                  <p className="mt-1 text-xs text-amber-900">
                    Generates diagram and scene images via OpenAI — uses API credits. Skip this if cost
                    is a concern; prompts above are enough for most shoots.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    disabled={!!busy || !dp || images.length === 0}
                    onClick={() => {
                      if (
                        !confirm(
                          "Generate AI previs images? This uses OpenAI image credits and can add cost."
                        )
                      ) {
                        return;
                      }
                      void runPreview(true);
                    }}
                  >
                    {busy === "preview-images" ? "Generating images…" : "Generate AI images (optional)"}
                  </Button>
                </div>
              </ScoutCard>
            ) : (
              <>
                {previews.some((p) => p.type === "lighting_diagram") && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Top-down lighting plan</h3>
                    <div className="space-y-4">
                      {previews
                        .filter((p) => p.type === "lighting_diagram")
                        .map((p) => (
                          <ScoutCard key={p.id}>
                            <p className="text-xs font-semibold uppercase text-sky-700">
                              {p.shotLabel ?? "Lighting diagram"}
                            </p>
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt="Top-down lighting diagram"
                                className="mt-3 w-full max-w-2xl rounded-lg border border-slate-200 bg-white"
                              />
                            ) : (
                              <p className="mt-2 text-xs text-amber-700">
                                {p.imageGenerationError ??
                                  "Diagram image not generated. Check OPENAI_API_KEY and server logs."}
                              </p>
                            )}
                            <details className="mt-3">
                              <summary className="cursor-pointer text-xs text-slate-500">Prompt</summary>
                              <p className="mt-2 text-sm text-slate-700">{p.prompt}</p>
                            </details>
                          </ScoutCard>
                        ))}
                    </div>
                  </div>
                )}

                {previews.some((p) => p.type === "cinematic_frame") && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">
                      Overall scene views — how the set should look
                    </h3>
                    <p className="mb-3 text-xs text-slate-500">
                      Three coverage angles from your uploaded location, re-lit per the DP plan.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {previews
                        .filter((p) => p.type === "cinematic_frame")
                        .map((p) => (
                          <ScoutCard key={p.id}>
                            <p className="text-xs font-semibold uppercase text-sky-700">
                              {p.shotLabel ?? p.type.replace(/_/g, " ")}
                              {p.shotNumber != null && (
                                <span className="ml-1 font-normal text-slate-500">#{p.shotNumber}</span>
                              )}
                            </p>
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.shotLabel ?? "Scene previs"}
                                className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-900 object-cover"
                              />
                            ) : (
                              <p className="mt-2 text-xs text-amber-700">
                                {p.imageGenerationError ??
                                  "Scene image not generated. Check OPENAI_API_KEY and server logs."}
                              </p>
                            )}
                            <details className="mt-3">
                              <summary className="cursor-pointer text-xs text-slate-500">Prompt</summary>
                              <p className="mt-2 text-sm text-slate-700">{p.prompt}</p>
                            </details>
                          </ScoutCard>
                        ))}
                    </div>
                  </div>
                )}
                <div className="pt-2 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={!!busy || !dp}
                    onClick={() => {
                      if (!confirmRegenerate("previs prompts")) return;
                      void runPreview(false);
                    }}
                  >
                    {busy === "preview" ? "Saving…" : "Regenerate prompts"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!!busy || !dp || images.length === 0}
                    onClick={() => {
                      if (
                        !confirm(
                          "Regenerate AI previs images? This uses OpenAI image credits and can add cost."
                        )
                      ) {
                        return;
                      }
                      void runPreview(true);
                    }}
                  >
                    {busy === "preview-images" ? "Generating…" : "Regenerate AI images (optional)"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "export" && (
          <ScoutCard>
            <h2 className="font-semibold text-slate-900">Export packet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Download a printable PDF or JSON packet for the crew. Includes analysis, DP plan, fixture table, shot list, and previs images.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>{analysis ? "✓ Location analysis" : "○ Location analysis"}</li>
              <li>{dp ? "✓ DP plan + camera settings" : "○ DP plan"}</li>
              <li>{dp?.fixtureAwareLighting ? "✓ Fixture assignment table" : "○ Fixture lighting"}</li>
              <li>{hasShotList ? "✓ Shot list" : "○ Shot list"}</li>
              <li>
                {previews.some((p) => p.imageUrl)
                  ? "✓ Scene previs images"
                  : previews.length
                    ? "✓ Previs prompts (no images)"
                    : "○ Previs prompts (optional)"}
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={!dp || pdfLoading}
                onClick={() => {
                  setPdfLoading(true);
                  void downloadScoutPdf(project).finally(() => setPdfLoading(false));
                }}
              >
                {pdfLoading ? "Building PDF…" : "Download PDF"}
              </Button>
              <Link href={`/scout/${id}/export`}>
                <Button variant="outline">Open export page</Button>
              </Link>
            </div>
          </ScoutCard>
        )}
      </div>

      <SharedNotesPanel
        resourceType="scout"
        resourceId={id}
        adminOpen={adminOpen}
        className="mt-8"
      />
    </ScoutShell>
  );
}
