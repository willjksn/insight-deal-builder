"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, FolderKanban, ScrollText, UserPlus } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ContentPanel, InfoCallout } from "@/components/ui/PageSection";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectAccessEditor } from "@/components/projectAccess/ProjectAccessEditor";
import { StandaloneScriptAccessEditor } from "@/components/projectAccess/StandaloneScriptAccessEditor";
import {
  fetchTeamManagementHub,
  PROJECT_ACCESS_LABELS,
} from "@/lib/projectAccess/apiClient";
import type { TeamUserCandidate } from "@/lib/projectAccess/apiClient";
import { APP_NAME } from "@/lib/brand";

interface ProjectAccessHubProps {
  initialProjectId?: string;
  /** When true, invite copy refers to approving users in this same page. */
  onAdminPage?: boolean;
}

export function ProjectAccessHub({ initialProjectId = "", onAdminPage = false }: ProjectAccessHubProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<
    { id: string; projectName: string; clientName?: string }[]
  >([]);
  const [standaloneScripts, setStandaloneScripts] = useState<{ id: string; title: string }[]>([]);
  const [candidates, setCandidates] = useState<TeamUserCandidate[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [copied, setCopied] = useState<"signup" | "onset" | null>(null);

  // Use the site the admin is on now (Vercel URL or custom domain). NEXT_PUBLIC_APP_URL
  // is for server-sent emails only — it may point at a domain not wired up yet.
  const signupUrl = useMemo(() => {
    if (typeof window === "undefined") return "/login";
    return `${window.location.origin}/login`;
  }, []);

  const onSetInviteUrl = useMemo(() => {
    if (typeof window === "undefined" || !selectedProjectId) return signupUrl;
    const next = `/projects/${selectedProjectId}/coverage`;
    return `${window.location.origin}/login?next=${encodeURIComponent(next)}`;
  }, [signupUrl, selectedProjectId]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTeamManagementHub(() => user.getIdToken());
      setProjects(data.projects);
      setCandidates(data.candidates);
      setStandaloneScripts(data.standaloneScripts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project access");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (initialProjectId && projects.some((p) => p.id === initialProjectId)) {
      setSelectedProjectId(initialProjectId);
    } else if (!selectedProjectId && projects.length === 1) {
      setSelectedProjectId(projects[0].id);
    }
  }, [initialProjectId, projects, selectedProjectId]);

  const projectOptions = useMemo(
    () => [
      { value: "", label: projects.length ? "Select a project…" : "No projects available" },
      ...projects.map((p) => ({
        value: p.id,
        label: p.clientName ? `${p.projectName} · ${p.clientName}` : p.projectName,
      })),
    ],
    [projects]
  );

  const scriptOptions = useMemo(
    () => [
      { value: "", label: standaloneScripts.length ? "Select a script…" : "No standalone scripts" },
      ...standaloneScripts.map((s) => ({ value: s.id, label: s.title })),
    ],
    [standaloneScripts]
  );

  const copyLink = async (url: string, kind: "signup" | "onset") => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy link.");
    }
  };

  if (loading) return <LoadingSpinner className="py-8" />;

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <UserPlus className="h-4 w-4 text-sky-600" />
          Invite new people
        </h3>
        <InfoCallout>
          {onAdminPage
            ? "New users sign up first. You can add them to a project while they are pending approval — they will get access once an admin approves their account in the list above."
            : "New users sign up first. You can add them to a project while pending — an admin must approve their account before they can sign in."}
        </InfoCallout>
        <ContentPanel className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Send them the sign-up link for {APP_NAME}.</li>
            <li>
              {onAdminPage
                ? "After they register, expand their row above to approve them — or add them to a project now and they will get access once approved."
                : "After they register, an admin approves their account (or add them to a project now — access starts when approved)."}
            </li>
            <li>
              Select a project below and add them (defaults to Coverage &amp; call sheet). Copy the
              on-set link from that section so login lands on Coverage.
            </li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{signupUrl}</code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copyLink(signupUrl, "signup")}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {copied === "signup" ? "Copied" : "Copy sign-up"}
            </Button>
            <a href={signupUrl} target="_blank" rel="noreferrer">
              <Button type="button" size="sm" variant="outline">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open sign-up
              </Button>
            </a>
          </div>
        </ContentPanel>
      </div>

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FolderKanban className="h-4 w-4 text-violet-600" />
          Project access
        </h3>
        <p className="text-sm text-slate-600">
          Pick a project, then choose a person and what they can edit:{" "}
          {Object.values(PROJECT_ACCESS_LABELS)
            .filter((l) => !l.toLowerCase().includes("legacy"))
            .join(", ")}. Linked scripts inherit
          these permissions.
        </p>
        <ContentPanel className="space-y-4">
          <Select
            label="Project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            options={projectOptions}
            disabled={projects.length === 0}
          />
          {selectedProjectId ? (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2">
                <code className="max-w-full flex-1 truncate text-xs text-sky-900">
                  {onSetInviteUrl}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyLink(onSetInviteUrl, "onset")}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {copied === "onset" ? "Copied" : "Copy on-set link"}
                </Button>
              </div>
              <ProjectAccessEditor projectId={selectedProjectId} hubCandidates={candidates} />
            </>
          ) : (
            <p className="text-sm text-slate-500">Select a project to manage its team.</p>
          )}
        </ContentPanel>
      </div>

      {standaloneScripts.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ScrollText className="h-4 w-4 text-violet-600" />
            Standalone script access
          </h3>
          <p className="text-sm text-slate-600">
            Scripts not linked to a project can be shared directly here. Once linked, use project access
            above instead.
          </p>
          <ContentPanel className="space-y-4">
            <Select
              label="Script session"
              value={selectedScriptId}
              onChange={(e) => setSelectedScriptId(e.target.value)}
              options={scriptOptions}
            />
            {selectedScriptId ? (
              <StandaloneScriptAccessEditor
                sessionId={selectedScriptId}
                hubCandidates={candidates}
              />
            ) : (
              <p className="text-sm text-slate-500">Select a script to manage sharing.</p>
            )}
          </ContentPanel>
        </div>
      )}
    </div>
  );
}
