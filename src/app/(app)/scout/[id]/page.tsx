"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Camera, Sparkles, Film, List, ImageIcon, FileDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScoutShell, ScoutCard, ScoutScoreBadge } from "@/components/scout/ScoutShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  getScoutProject,
  getScoutProjectImages,
} from "@/lib/firebase/scoutFirestore";
import { uploadScoutImage } from "@/lib/scout/storage";
import {
  scoutAnalyze,
  scoutGenerateDpPlan,
  scoutGeneratePreview,
  scoutGenerateShotList,
  scoutRegisterImage,
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
import { LightingAssignmentTable } from "@/components/scout/LightingAssignmentTable";
import { ScoutLinkToProjectCard } from "@/components/scout/ScoutLinkToProjectCard";
import { useConditionalCollection } from "@/hooks/useConditionalCollection";
import { Project } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

function formatPlanValue(v: string | string[] | undefined): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.length ? v.join(" · ") : "—";
  return v;
}

type Tab = "upload" | "analysis" | "plan" | "shots" | "preview" | "export";

export default function ScoutProjectPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, appUser } = useAuth();
  const canLinkProjects = canLinkScoutToProject(appUser);
  const { data: productionProjects } = useConditionalCollection<Project>("projects", canLinkProjects);
  const [project, setProject] = useState<ScoutProject | null>(null);
  const [images, setImages] = useState<ScoutProjectImage[]>([]);
  const [tab, setTab] = useState<Tab>("upload");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState<ScoutImageLabel>("unlabeled");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !user?.uid || !project) return;
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

  const runPreview = async () => {
    setBusy("preview");
    setError(null);
    try {
      const result = await scoutGeneratePreview(id);
      await refresh();
      setTab("preview");
      const warnings = Array.isArray(result.warnings) ? (result.warnings as string[]) : [];
      if (warnings.length) {
        setError(
          `Previs prompts saved, but some images failed: ${warnings.slice(0, 2).join(" · ")}${
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
        "Regenerate everything from your current photos and settings?\n\nThis re-runs analysis (if needed), DP plan, shot list, and previs."
      )
    ) {
      return;
    }
    setBusy("all");
    setError(null);
    try {
      if (!analysis) await scoutAnalyze(id);
      await scoutGenerateDpPlan(id);
      await scoutGenerateShotList(id);
      const result = await scoutGeneratePreview(id);
      await refresh();
      setTab("preview");
      const warnings = Array.isArray(result.warnings) ? (result.warnings as string[]) : [];
      if (warnings.length) {
        setError(
          `Regenerated, but some previs images failed: ${warnings.slice(0, 2).join(" · ")}${
            warnings.length > 2 ? ` (+${warnings.length - 2} more)` : ""
          }`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setBusy(null);
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
  const shots = project.latestShotList;
  const previews = project.latestPreviews ?? [];
  const isBeginner = project.skillLevel === "beginner";

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
                {busy === "all" ? "Regenerating…" : "Regenerate all"}
              </Button>
            )}
          </div>
        </div>

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
          </div>
        )}

        {tab === "plan" && dp && (
          <div className="space-y-6">
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

            {!shots && (
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
          </div>
        )}

        {tab === "shots" && shots && (
          <ScoutCard className="overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Lens</th>
                  <th className="px-4 py-3">Movement</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Priority</th>
                </tr>
              </thead>
              <tbody>
                {shots.shots.map((s) => (
                  <tr key={s.shotNumber} className="border-t border-slate-100">
                    <td className="px-4 py-3 tabular-nums">{s.shotNumber}</td>
                    <td className="px-4 py-3">{s.shotType.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">{s.lens}</td>
                    <td className="px-4 py-3">{s.cameraMovement}</td>
                    <td className="px-4 py-3 max-w-xs">{s.subjectAction}</td>
                    <td className="px-4 py-3 capitalize">{s.priority.replace(/_/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!previews.length && (
              <div className="p-4 border-t border-slate-100">
                <p className="mb-3 text-xs text-slate-500">
                  Lighting diagram plus 3 overall scene views (wide, medium, mood) — not one image per
                  shot.
                </p>
                <Button onClick={() => void runPreview()} disabled={!!busy}>
                  Generate diagram &amp; scene views →
                </Button>
              </div>
            )}
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
          </ScoutCard>
        )}

        {tab === "preview" && (
          <div className="space-y-6">
            {previews.length === 0 ? (
              <ScoutCard>
                <p className="text-sm text-slate-600">
                  Top-down lighting diagram plus 3 overall scene views of your location (not one image
                  per shot in the list).
                </p>
                <Button onClick={() => void runPreview()} disabled={!!busy || !dp} className="mt-4">
                  Generate diagram &amp; scene views
                </Button>
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
                <div className="pt-2">
                  <Button
                    variant="outline"
                    disabled={!!busy || !dp}
                    onClick={() => {
                      if (!confirmRegenerate("lighting diagram")) return;
                      void runPreview();
                    }}
                  >
                    {busy === "preview" ? "Regenerating…" : "Regenerate diagram"}
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
              Download JSON or view the full export page. Printable PDF coming soon.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>{analysis ? "✓ Location analysis" : "○ Location analysis"}</li>
              <li>{dp ? "✓ DP plan + camera settings" : "○ DP plan"}</li>
              <li>{dp?.fixtureAwareLighting ? "✓ Fixture assignment table" : "○ Fixture lighting"}</li>
              <li>{shots ? "✓ Shot list" : "○ Shot list"}</li>
              <li>{previews.length ? "✓ Scene previs + lighting diagram" : "○ Scene previs"}</li>
            </ul>
            <Link href={`/scout/${id}/export`} className="mt-4 inline-block">
              <Button>Open export page</Button>
            </Link>
          </ScoutCard>
        )}
      </div>
    </ScoutShell>
  );
}
