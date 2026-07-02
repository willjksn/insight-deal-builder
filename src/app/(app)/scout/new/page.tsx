"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScoutShell, ScoutCard } from "@/components/scout/ScoutShell";
import { ScoutSessionForm } from "@/components/scout/ScoutSessionForm";
import { useAuth } from "@/contexts/AuthContext";
import { useConditionalCollection } from "@/hooks/useConditionalCollection";
import { useScoutProjects } from "@/hooks/useScoutProjects";
import { getDocument } from "@/lib/firebase/firestore";
import { getProductionBoardByProject } from "@/lib/firebase/productionFirestore";
import { getGearProfiles, getScoutProjectsByIds } from "@/lib/firebase/scoutFirestore";
import { scoutCreateProject } from "@/lib/scout/apiClient";
import {
  readSessionFormFromSubmit,
  validateScoutSessionForm,
} from "@/lib/scout/readSessionFormFromSubmit";
import {
  DEFAULT_SCOUT_SESSION_FORM,
  formValuesToScoutProjectFields,
  ScoutSessionFormValues,
} from "@/lib/scout/sessionForm";
import { ScoutGearProfile, ScoutProject } from "@/lib/scout/types";
import { Project } from "@/lib/types";
import { canLinkScoutToProject, canUseShotScout } from "@/lib/utils/permissions";
import {
  pickScoutSessionsForProject,
  prefillScoutSessionForm,
  projectsForScoutLinkDisplay,
  scoutNewHrefForProject,
  scoutResumeHref,
} from "@/lib/utils/scoutProjectLink";

function ScoutNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, appUser } = useAuth();
  const canLinkProjects = canLinkScoutToProject(appUser);
  const { data: projects } = useConditionalCollection<Project>("projects", canLinkProjects);
  const { data: allScoutSessions } = useScoutProjects(user?.uid, canUseShotScout(appUser));

  const projectIdParam = searchParams.get("projectId") ?? "";
  const forceNew = searchParams.get("forceNew") === "1";

  const [gearProfiles, setGearProfiles] = useState<ScoutGearProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(Boolean(projectIdParam));
  const [existingScout, setExistingScout] = useState<ScoutProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"projectName" | "sceneIdea", string>>
  >({});
  const [linkedProjectId, setLinkedProjectId] = useState(projectIdParam);
  const [form, setForm] = useState<ScoutSessionFormValues>(DEFAULT_SCOUT_SESSION_FORM);

  const applyProjectContext = useCallback(
    async (pid: string, options?: { redirectIfExists?: boolean }) => {
      if (!pid) {
        setExistingScout(null);
        setResolving(false);
        return;
      }

      setResolving(true);
      try {
        const board = await getProductionBoardByProject(pid).catch(() => null);
        const boardIds = board?.linkedScoutProjectIds ?? [];
        const project = await getDocument<Project>("projects", pid);

        const missingBoardIds = boardIds.filter(
          (scoutId) => !allScoutSessions.some((session) => session.id === scoutId)
        );
        const boardOnly =
          missingBoardIds.length > 0
            ? await getScoutProjectsByIds(missingBoardIds).catch(() => [] as ScoutProject[])
            : [];

        const sessions = pickScoutSessionsForProject(
          [...allScoutSessions, ...boardOnly],
          pid,
          {
            boardLinkedScoutIds: boardIds,
            projectName: project?.projectName,
          }
        );
        const primary = sessions[0] ?? null;

        if (primary && options?.redirectIfExists !== false && !forceNew) {
          router.replace(scoutResumeHref(primary.id, primary));
          return;
        }

        setExistingScout(primary);
        if (project) {
          setLinkedProjectId(pid);
          setForm((current) =>
            prefillScoutSessionForm(project, {
              existingScout: primary,
              board,
              current,
            })
          );
        }
      } catch {
        setError("Could not load project scout details.");
      } finally {
        setResolving(false);
      }
    },
    [allScoutSessions, forceNew, router]
  );

  useEffect(() => {
    if (projectIdParam) {
      void applyProjectContext(projectIdParam);
    }
  }, [projectIdParam, applyProjectContext, allScoutSessions]);

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
    if (!projectId) {
      setExistingScout(null);
      return;
    }
    void applyProjectContext(projectId);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.uid) return;
    setError(null);
    setFieldErrors({});

    const submission = readSessionFormFromSubmit(e.currentTarget, form);
    setForm(submission);

    const validation = validateScoutSessionForm(submission);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setError(validation.message);
      return;
    }

    if (!forceNew && linkedProjectId) {
      const linkedProject = projects.find((p) => p.id === linkedProjectId);
      const sessions = pickScoutSessionsForProject(allScoutSessions, linkedProjectId, {
        projectName: linkedProject?.projectName,
      });
      const existing = sessions[0];
      if (existing) {
        router.replace(scoutResumeHref(existing.id, existing));
        return;
      }
    }

    setSaving(true);
    try {
      const id = await scoutCreateProject({
        userId: user.uid,
        ...formValuesToScoutProjectFields(submission, linkedProjectId, linkedProject?.projectName),
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

  if (resolving) {
    return (
      <ScoutShell>
        <LoadingSpinner className="py-20" />
      </ScoutShell>
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
        <h1 className="text-2xl font-bold text-slate-900">
          {forceNew ? "Another scout session" : "New scout session"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {existingScout && forceNew
            ? "Starting a second scout for this project — your previous answers are copied as a starting point."
            : existingScout
              ? "Update scene details below, or open your existing session instead."
              : "Tell us about the scene and your gear. You'll upload location photos next."}
        </p>

        {existingScout && !forceNew ? (
          <ScoutCard className="mt-6 border-sky-200 bg-sky-50/50">
            <p className="text-sm text-sky-950">
              You already have a scout session for this project with scene details and gear saved.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/scout/${existingScout.id}`}>
                <Button size="sm">Open existing session</Button>
              </Link>
              {linkedProjectId ? (
                <Link href={scoutNewHrefForProject(linkedProjectId, true)}>
                  <Button size="sm" variant="outline">
                    Create another scout
                  </Button>
                </Link>
              ) : null}
            </div>
          </ScoutCard>
        ) : null}

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
            fieldErrors={fieldErrors}
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
