"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import {
  addProjectMember,
  fetchProjectTeam,
  PROJECT_ACCESS_LABELS,
  removeProjectMember,
  updateProjectMemberPermissions,
} from "@/lib/projectAccess/apiClient";
import {
  EMPTY_PROJECT_ACCESS,
  ProjectAccessArea,
  ProjectAccessPermissions,
  ProjectMember,
} from "@/lib/projectAccess/types";

const ACCESS_AREAS: ProjectAccessArea[] = ["scripts", "scout", "production", "shots"];

interface ProjectTeamPanelProps {
  projectId: string;
}

export function ProjectTeamPanel({ projectId }: ProjectTeamPanelProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [newPerms, setNewPerms] = useState<ProjectAccessPermissions>({
    scripts: true,
    scout: false,
    production: false,
    shots: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjectTeam(() => user.getIdToken(), projectId);
      setMembers(data.members);
      setCanManageTeam(data.canManageTeam);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addMember = async () => {
    if (!user || !email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addProjectMember(() => user.getIdToken(), projectId, email.trim(), newPerms);
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = async (member: ProjectMember, area: ProjectAccessArea) => {
    if (!user) return;
    const next = {
      ...member.permissions,
      [area]: !member.permissions[area],
    };
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

  const remove = async (member: ProjectMember) => {
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
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-500">Loading team access…</p>
        </CardBody>
      </Card>
    );
  }

  if (!canManageTeam && members.length === 0) {
    return null;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-900">Team access</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Invite teammates or partners to this project. Choose what they can edit — scripts, Scout,
          pre-production, and call sheet shots. Access applies to linked scripts and scout sessions
          even if they are added later.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {canManageTeam && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-800">Add someone</p>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@company.com"
            />
            <PermissionCheckboxes
              permissions={newPerms}
              onChange={setNewPerms}
              disabled={saving}
            />
            <Button type="button" disabled={saving || !email.trim()} onClick={() => void addMember()}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add to project
            </Button>
          </div>
        )}

        {members.length === 0 ? (
          <p className="text-sm text-slate-500">No collaborators yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {members.map((member) => (
              <li key={member.userId} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {member.displayName || member.email}
                    </p>
                    {member.displayName && (
                      <p className="text-xs text-slate-500">{member.email}</p>
                    )}
                  </div>
                  {canManageTeam && (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-600"
                      aria-label="Remove member"
                      disabled={saving}
                      onClick={() => void remove(member)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {canManageTeam ? (
                  <PermissionCheckboxes
                    permissions={member.permissions}
                    onToggle={(area) => void togglePerm(member, area)}
                    disabled={saving}
                  />
                ) : (
                  <PermissionSummary permissions={member.permissions} />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
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
              else if (onChange) {
                onChange({ ...permissions, [area]: !permissions[area] });
              }
            }}
          />
          {PROJECT_ACCESS_LABELS[area]}
        </label>
      ))}
    </div>
  );
}

function PermissionSummary({ permissions }: { permissions: ProjectAccessPermissions }) {
  const active = ACCESS_AREAS.filter((a) => permissions[a]);
  if (!active.length) {
    return <p className="text-xs text-slate-400">No areas assigned</p>;
  }
  return (
    <p className="text-xs text-slate-600">
      {active.map((a) => PROJECT_ACCESS_LABELS[a]).join(" · ")}
    </p>
  );
}

export { EMPTY_PROJECT_ACCESS };
