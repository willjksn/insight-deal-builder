"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScoutShell } from "@/components/scout/ScoutShell";
import { ScoutSessionForm } from "@/components/scout/ScoutSessionForm";
import { useAuth } from "@/contexts/AuthContext";
import { useConditionalCollection } from "@/hooks/useConditionalCollection";
import { getDocument } from "@/lib/firebase/firestore";
import { scoutCreateProject } from "@/lib/scout/apiClient";
import { getGearProfiles } from "@/lib/firebase/scoutFirestore";
import {
  DEFAULT_SCOUT_SESSION_FORM,
  formValuesToScoutProjectFields,
  ScoutSessionFormValues,
} from "@/lib/scout/sessionForm";
import { ScoutGearProfile } from "@/lib/scout/types";
import { Project } from "@/lib/types";
import { canLinkScoutToProject, canUseShotScout } from "@/lib/utils/permissions";
import {
  projectsForScoutLinkDisplay,
  suggestScoutSessionName,
} from "@/lib/utils/scoutProjectLink";

function ScoutNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, appUser } = useAuth();
  const canLinkProjects = canLinkScoutToProject(appUser);
  const { data: projects } = useConditionalCollection<Project>("projects", canLinkProjects);

  const [gearProfiles, setGearProfiles] = useState<ScoutGearProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedProjectId, setLinkedProjectId] = useState(searchParams.get("projectId") ?? "");
  const [form, setForm] = useState<ScoutSessionFormValues>(DEFAULT_SCOUT_SESSION_FORM);

  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (!pid) return;
    getDocument<Project>("projects", pid).then((p) => {
      if (p) {
        setLinkedProjectId(p.id);
        setForm((f) => ({
          ...f,
          projectName: f.projectName || suggestScoutSessionName(p),
        }));
      }
    });
  }, [searchParams]);

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
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    setForm((f) => ({
      ...f,
      projectName: f.projectName.trim() ? f.projectName : suggestScoutSessionName(project),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setError(null);
    if (!form.projectName.trim() || !form.sceneIdea.trim()) {
      setError("Session name and scene idea are required.");
      return;
    }
    setSaving(true);
    try {
      const id = await scoutCreateProject({
        userId: user.uid,
        ...formValuesToScoutProjectFields(form, linkedProjectId, linkedProject?.projectName),
        status: "needs_images",
      });
      router.push(`/scout/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setSaving(false);
    }
  };

  if (!canUseShotScout(appUser)) {
    return (
      <div className="py-20 text-center text-slate-500">You don&apos;t have access to Shot Scout.</div>
    );
  }

  return (
    <ScoutShell>
      <div className="mx-auto max-w-2xl px-4 pb-24">
        <Link
          href="/scout"
          className="mb-6 inline-flex items-center text-sm text-sky-600 hover:text-sky-800"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          All sessions
        </Link>

        <div className="mb-2 h-1 w-10 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" />
        <h1 className="text-2xl font-bold text-slate-900">New scout session</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tell us about the scene and your gear. You&apos;ll upload location photos next.
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" size="touch" disabled={saving} className="w-full sm:w-auto">
            {saving ? "Creating…" : "Continue to location upload"}
          </Button>
        </form>
      </div>
    </ScoutShell>
  );
}

export default function ScoutNewPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="py-20" />}>
      <ScoutNewForm />
    </Suspense>
  );
}
