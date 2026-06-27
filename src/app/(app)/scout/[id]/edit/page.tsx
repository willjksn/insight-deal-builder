"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScoutShell, ScoutCard } from "@/components/scout/ScoutShell";
import { ScoutSessionForm } from "@/components/scout/ScoutSessionForm";
import { useAuth } from "@/contexts/AuthContext";
import { useConditionalCollection } from "@/hooks/useConditionalCollection";
import {
  getGearProfiles,
  getScoutProject,
  updateScoutProject,
} from "@/lib/firebase/scoutFirestore";
import {
  scoutAnalyze,
  scoutGenerateDpPlan,
  scoutGeneratePreview,
  scoutGenerateShotList,
} from "@/lib/scout/apiClient";
import {
  DEFAULT_SCOUT_SESSION_FORM,
  formValuesToScoutProjectFields,
  scoutProjectToFormValues,
  scoutSessionHasDownstreamArtifacts,
  ScoutSessionFormValues,
} from "@/lib/scout/sessionForm";
import { ScoutGearProfile, ScoutProject } from "@/lib/scout/types";
import { Project } from "@/lib/types";
import { canLinkScoutToProject, canUseShotScout } from "@/lib/utils/permissions";
import {
  projectsForScoutLinkDisplay,
  suggestScoutSessionName,
} from "@/lib/utils/scoutProjectLink";

export default function ScoutEditPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, appUser } = useAuth();
  const canLinkProjects = canLinkScoutToProject(appUser);
  const { data: projects } = useConditionalCollection<Project>("projects", canLinkProjects);

  const [project, setProject] = useState<ScoutProject | null>(null);
  const [gearProfiles, setGearProfiles] = useState<ScoutGearProfile[]>([]);
  const [form, setForm] = useState<ScoutSessionFormValues>(DEFAULT_SCOUT_SESSION_FORM);
  const [linkedProjectId, setLinkedProjectId] = useState("");
  const [regenerateAfterSave, setRegenerateAfterSave] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getScoutProject(id)
      .then((p) => {
        if (!p) return;
        setProject(p);
        setForm(scoutProjectToFormValues(p));
        setLinkedProjectId(p.linkedProjectId ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load session"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user?.uid) return;
    getGearProfiles(user.uid).then(setGearProfiles).catch(() => setGearProfiles([]));
  }, [user?.uid]);

  const linkedProject = useMemo(
    () => projects.find((p) => p.id === linkedProjectId),
    [projects, linkedProjectId]
  );

  const handleProjectLinkChange = (projectId: string) => {
    setLinkedProjectId(projectId);
    const nextProject = projects.find((p) => p.id === projectId);
    if (!nextProject) return;
    setForm((f) => ({
      ...f,
      projectName: f.projectName.trim() ? f.projectName : suggestScoutSessionName(nextProject),
    }));
  };

  const regenerateDownstream = async () => {
    if (!project?.latestAnalysis) {
      await scoutAnalyze(id);
    }
    await scoutGenerateDpPlan(id);
    await scoutGenerateShotList(id);
    await scoutGeneratePreview(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !project) return;
    setError(null);
    if (!form.projectName.trim() || !form.sceneIdea.trim()) {
      setError("Session name and scene idea are required.");
      return;
    }

    setSaving(true);
    try {
      await updateScoutProject(
        id,
        formValuesToScoutProjectFields(form, linkedProjectId, linkedProject?.projectName)
      );

      if (regenerateAfterSave && scoutSessionHasDownstreamArtifacts(project)) {
        await regenerateDownstream();
      }

      router.push(`/scout/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session");
    } finally {
      setSaving(false);
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

  const hasArtifacts = scoutSessionHasDownstreamArtifacts(project);

  return (
    <ScoutShell>
      <div className="mx-auto max-w-2xl px-4 pb-24">
        <Link
          href={`/scout/${id}`}
          className="mb-6 inline-flex items-center text-sm text-sky-600 hover:text-sky-800"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to session
        </Link>

        <div className="mb-2 h-1 w-10 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" />
        <h1 className="text-2xl font-bold text-slate-900">Edit scout session</h1>
        <p className="mt-2 text-sm text-slate-600">
          Update scene details, mood, platform, or gear. Regenerate downstream plans when settings change.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-6">
          <ScoutSessionForm
            form={form}
            onChange={setForm}
            linkedProjectId={linkedProjectId}
            onLinkedProjectChange={handleProjectLinkChange}
            projects={projectsForScoutLinkDisplay(projects)}
            canLinkProjects={canLinkProjects}
            gearProfiles={gearProfiles}
            linkedProject={linkedProject}
          />

          {hasArtifacts && (
            <ScoutCard className="border-sky-200 bg-sky-50/40">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={regenerateAfterSave}
                  onChange={(e) => setRegenerateAfterSave(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    Regenerate after saving
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    Re-runs analysis (if needed), DP plan, shot list, and previs so outputs match your
                    updated settings. Replaces the current versions.
                  </span>
                </span>
              </label>
            </ScoutCard>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="touch" disabled={saving}>
              {saving
                ? regenerateAfterSave && hasArtifacts
                  ? "Saving & regenerating…"
                  : "Saving…"
                : "Save changes"}
            </Button>
            <Link href={`/scout/${id}`}>
              <Button type="button" variant="secondary" size="touch">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </ScoutShell>
  );
}
