"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InfoCallout } from "@/components/ui/PageSection";
import { useAuth } from "@/contexts/AuthContext";
import {
  addProjectMember,
  fetchProjectTeam,
  PROJECT_ACCESS_LABELS,
  removeProjectMember,
  TeamUserCandidate,
  updateProjectMemberPermissions,
} from "@/lib/projectAccess/apiClient";
import {
  ProjectAccessArea,
  ProjectAccessPermissions,
  ProjectMember,
} from "@/lib/projectAccess/types";

const ACCESS_AREAS: ProjectAccessArea[] = ["scripts", "production", "shots"];

function candidateLabel(candidate: TeamUserCandidate): string {
  if (candidate.displayName?.trim()) {
    return `${candidate.displayName.trim()} (${candidate.email})`;
  }
  return candidate.email;
}

type ProjectMemberRow = ProjectMember & { accountApproved?: boolean };

interface ProjectAccessEditorProps {
  projectId: string;
  /** Pre-loaded from hub — avoids a second candidates fetch when provided. */
  hubCandidates?: TeamUserCandidate[];
}

export function ProjectAccessEditor({ projectId, hubCandidates }: ProjectAccessEditorProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMemberRow[]>([]);
  const [candidates, setCandidates] = useState<TeamUserCandidate[]>(hubCandidates ?? []);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPerms, setNewPerms] = useState<ProjectAccessPermissions>({
    scripts: true,
    scout: false,
    production: false,
    shots: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjectTeam(() => user.getIdToken(), projectId);
      setMembers(data.members as ProjectMemberRow[]);
      setCandidates(data.candidates ?? hubCandidates ?? []);
      setCanManageTeam(data.canManageTeam);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, [user, projectId, hubCandidates]);

  useEffect(() => {
    void load();
  }, [load]);

  const addableCandidates = useMemo(
    () => candidates.filter((c) => !members.some((m) => m.userId === c.userId)),
    [candidates, members]
  );

  const selectedCandidate = useMemo(
    () => addableCandidates.find((c) => c.userId === selectedUserId),
    [addableCandidates, selectedUserId]
  );

  const selectOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: "", label: "Select a person…" }];
    for (const c of addableCandidates) {
      options.push({
        value: c.userId,
        label: c.approved ? candidateLabel(c) : `${candidateLabel(c)} — pending approval`,
      });
    }
    return options;
  }, [addableCandidates]);

  const addMember = async () => {
    if (!user || !selectedUserId) return;
    setSaving(true);
    setError(null);
    setPendingNotice(null);
    try {
      await addProjectMember(() => user.getIdToken(), projectId, selectedUserId, newPerms);
      if (selectedCandidate && !selectedCandidate.approved) {
        setPendingNotice(
          `${candidateLabel(selectedCandidate)} was added to this project. They cannot sign in until an admin approves their account.`
        );
      }
      setSelectedUserId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = async (member: ProjectMemberRow, area: ProjectAccessArea) => {
    if (!user) return;
    const next = { ...member.permissions, [area]: !member.permissions[area] };
    setSaving(true);
    setError(null);
    try {
      await updateProjectMemberPermissions(() => user.getIdToken(), projectId, member.userId, next);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: ProjectMemberRow) => {
    if (!user) return;
    if (!window.confirm(`Remove ${member.displayName || member.email} from this project?`)) return;
    setSaving(true);
    setError(null);
    try {
      await removeProjectMember(() => user.getIdToken(), projectId, member.userId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner className="py-8" />;
  }

  if (!canManageTeam) {
    return (
      <p className="text-sm text-slate-500">
        You can view this project but cannot manage its team. Ask a project owner or admin.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {pendingNotice ? (
        <InfoCallout variant="sky">{pendingNotice}</InfoCallout>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-800">Add someone</p>
        {addableCandidates.length === 0 ? (
          <p className="text-sm text-slate-500">
            Everyone in the system is already on this project, or no other users have signed up yet.
          </p>
        ) : (
          <>
            <Select
              label="Person"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              options={selectOptions}
              disabled={saving}
            />
            {selectedCandidate && !selectedCandidate.approved ? (
              <p className="text-xs text-amber-800">
                This person is waiting for admin approval. You can add them now — they will get project
                access once their account is approved.
              </p>
            ) : null}
            <PermissionCheckboxes permissions={newPerms} onChange={setNewPerms} disabled={saving} />
            <Button type="button" disabled={saving || !selectedUserId} onClick={() => void addMember()}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add to project
            </Button>
          </>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-slate-500">No collaborators on this project yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {members.map((member) => (
            <li key={member.userId} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{member.displayName || member.email}</p>
                  {member.displayName && <p className="text-xs text-slate-500">{member.email}</p>}
                  {member.accountApproved === false ? (
                    <p className="mt-1 text-xs font-medium text-amber-700">Pending account approval</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="text-slate-400 hover:text-red-600"
                  aria-label="Remove member"
                  disabled={saving}
                  onClick={() => void remove(member)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <PermissionCheckboxes
                permissions={member.permissions}
                onToggle={(area) => void togglePerm(member, area)}
                disabled={saving}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PermissionCheckboxes({
  permissions,
  onChange,
  onToggle,
  disabled,
}: {
  permissions: ProjectAccessPermissions;
  onChange?: (next: ProjectAccessPermissions) => void;
  onToggle?: (area: ProjectAccessArea) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {ACCESS_AREAS.map((area) => (
        <label key={area} className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={permissions[area]}
            disabled={disabled}
            onChange={() => {
              if (onToggle) onToggle(area);
              else if (onChange) onChange({ ...permissions, [area]: !permissions[area] });
            }}
          />
          {PROJECT_ACCESS_LABELS[area]}
        </label>
      ))}
    </div>
  );
}
