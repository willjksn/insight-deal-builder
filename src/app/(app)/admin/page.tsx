"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ContentPanel, InfoCallout, PageSection } from "@/components/ui/PageSection";
import { useCollection } from "@/hooks/useCollection";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/contexts/AuthContext";
import {
  INSIGHT_MEDIA_GROUP_LLC,
  canManageProjects,
  canManageUsers,
  resolvePermissions,
} from "@/lib/utils/permissions";
import { ProjectAccessHub } from "@/components/projectAccess/ProjectAccessHub";
import { AiUsagePanel } from "@/components/admin/AiUsagePanel";
import { SearchModePanel } from "@/components/admin/SearchModePanel";
import { AdminWorkspacePanel } from "@/components/admin/AdminWorkspacePanel";
import { ReferenceGuideAdminPanel } from "@/components/admin/ReferenceGuideAdminPanel";
import { isUserApproved, isUserArchived, isUserPendingApproval, shouldApproveOnAdminSave } from "@/lib/users/approval";
import { canRemoveUserAccess, canRestorePartnerUser } from "@/lib/users/archivePartner";
import { deleteField } from "firebase/firestore";
import {
  EMPTY_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  PERMISSION_GROUPS,
  PERMISSION_PRESETS,
  sanitizePermissionsForCompany,
} from "@/lib/constants/permissions";
import { AppUser, UserPermissions, UserRole } from "@/lib/types";
import { Check, Shield, Users, Building2, ChevronDown, Archive, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type UserEdits = Record<
  string,
  {
    displayName: string;
    company: string;
    permissions: UserPermissions;
  }
>;

function permissionsEqual(a: UserPermissions, b: UserPermissions): boolean {
  return PERMISSION_DEFINITIONS.every((d) => a[d.key] === b[d.key]);
}

function matchingPresetId(
  permissions: UserPermissions,
  company: string
): string | null {
  for (const preset of PERMISSION_PRESETS) {
    const sanitized = sanitizePermissionsForCompany(
      preset.permissions,
      company,
      INSIGHT_MEDIA_GROUP_LLC
    );
    if (permissionsEqual(permissions, sanitized)) {
      return preset.id;
    }
  }
  return null;
}

function userSummaryLabel(permissions: UserPermissions, company: string): string {
  if (permissions.manageUsers && company === INSIGHT_MEDIA_GROUP_LLC) return "Full admin";
  if (permissions.exportPayments && company === INSIGHT_MEDIA_GROUP_LLC && !permissions.editQuotes) {
    return "Accounting";
  }
  if (permissions.viewIdentityDocs && permissions.editQuotes && company === INSIGHT_MEDIA_GROUP_LLC) {
    return "Compliance";
  }
  if (permissions.createQuotes && company !== INSIGHT_MEDIA_GROUP_LLC && company) return "Partner";
  if (permissions.createQuotes && company === INSIGHT_MEDIA_GROUP_LLC) return "Producer";
  if (permissions.signQuotes) return "View & sign";
  return "Limited access";
}

type UserListFilter = "active" | "pending" | "archived";

function badgeVariant(label: string): "success" | "warning" | "info" | "default" | "danger" {
  if (label === "Full admin") return "success";
  if (label === "Pending approval") return "warning";
  if (label === "Archived") return "danger";
  if (label === "Partner") return "info";
  if (label === "Producer") return "warning";
  if (label === "Accounting") return "info";
  if (label === "Compliance") return "warning";
  return "default";
}

function userInitials(user: AppUser, displayName: string): string {
  const source = displayName || user.email;
  return source
    .split(/[\s@]+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("project") ?? "";
  const { appUser, refreshProfile, user: firebaseUser } = useAuth();
  const { data: users, loading, refresh } = useCollection<AppUser>("users");
  const { data: companies } = useCollection<{ id: string; displayName: string }>("companies");
  const { update, saving } = useMutations("users");
  const [edits, setEdits] = useState<UserEdits>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userListFilter, setUserListFilter] = useState<UserListFilter>("active");
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const isOrgAdmin = canManageUsers(appUser);
  const canManageProjectTeams = canManageProjects(appUser) || isOrgAdmin;
  const canAccessAdmin = isOrgAdmin || canManageProjectTeams;

  useEffect(() => {
    if (appUser && !canAccessAdmin) {
      router.replace("/dashboard");
    }
  }, [appUser, canAccessAdmin, router]);

  const companyOptions = useMemo(() => {
    const names = new Set<string>([INSIGHT_MEDIA_GROUP_LLC]);
    for (const c of companies) {
      if (c.displayName) names.add(c.displayName);
    }
    return [
      { value: "", label: "None" },
      ...Array.from(names)
        .sort()
        .map((name) => ({ value: name, label: name })),
    ];
  }, [companies]);

  const stats = useMemo(() => {
    const img = users.filter((u) => u.company === INSIGHT_MEDIA_GROUP_LLC).length;
    const partners = users.filter(
      (u) => u.company && u.company !== INSIGHT_MEDIA_GROUP_LLC && !isUserArchived(u)
    ).length;
    const pending = users.filter((u) => isUserPendingApproval(u)).length;
    const archived = users.filter((u) => isUserArchived(u)).length;
    return { total: users.length, img, partners, pending, archived };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userListFilter === "archived") return isUserArchived(u);
      if (userListFilter === "pending") return isUserPendingApproval(u);
      return isUserApproved(u);
    });
  }, [users, userListFilter]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const aPending = isUserPendingApproval(a) ? 0 : 1;
      const bPending = isUserPendingApproval(b) ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return (a.email || "").localeCompare(b.email || "");
    });
  }, [filteredUsers]);

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const user of users) {
        if (isUserPendingApproval(user)) next.add(user.id);
      }
      return next;
    });
  }, [users]);

  const toggleExpanded = (userId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const getEdit = (user: AppUser) => {
    const base = edits[user.id];
    if (base) return base;
    return {
      displayName: user.displayName ?? "",
      company: user.company ?? "",
      permissions: resolvePermissions(user),
    };
  };

  const setEdit = (
    userId: string,
    patch: Partial<{ displayName: string; company: string; permissions: UserPermissions }>
  ) => {
    setEdits((prev) => {
      const user = users.find((u) => u.id === userId);
      const base = prev[userId] ?? {
        displayName: user?.displayName ?? "",
        company: user?.company ?? "",
        permissions: user ? resolvePermissions(user) : { ...EMPTY_PERMISSIONS },
      };
      let next = { ...base, ...patch };
      if (patch.company !== undefined) {
        next.permissions = sanitizePermissionsForCompany(
          next.permissions,
          next.company,
          INSIGHT_MEDIA_GROUP_LLC
        );
      }
      return { ...prev, [userId]: next };
    });
    setExpandedIds((prev) => new Set(prev).add(userId));
  };

  const togglePermission = (userId: string, key: keyof UserPermissions) => {
    const edit = getEdit(users.find((u) => u.id === userId)!);
    setEdit(userId, {
      permissions: { ...edit.permissions, [key]: !edit.permissions[key] },
    });
  };

  const applyPreset = (userId: string, permissions: UserPermissions) => {
    const edit = getEdit(users.find((u) => u.id === userId)!);
    setEdit(userId, {
      permissions: sanitizePermissionsForCompany(
        permissions,
        edit.company,
        INSIGHT_MEDIA_GROUP_LLC
      ),
    });
  };

  const handleSave = async (user: AppUser) => {
    setError(null);
    const edit = getEdit(user);
    const permissions = sanitizePermissionsForCompany(
      edit.permissions,
      edit.company,
      INSIGHT_MEDIA_GROUP_LLC
    );

    if (permissions.manageUsers && edit.company !== INSIGHT_MEDIA_GROUP_LLC) {
      setError(`Only ${INSIGHT_MEDIA_GROUP_LLC} users can manage other users.`);
      return;
    }

    const role: UserRole =
      permissions.manageUsers && edit.company === INSIGHT_MEDIA_GROUP_LLC
        ? "admin"
        : "member";

    try {
      const wasPending = isUserPendingApproval(user);
      const approved = shouldApproveOnAdminSave(edit.company, permissions);
      await update(user.id, {
        displayName: edit.displayName.trim() || user.email,
        company: edit.company,
        permissions,
        role,
        approved,
        ...(approved
          ? { archivedAt: deleteField(), archivedByUserId: deleteField() }
          : {}),
      });
      if (wasPending && approved && firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          await fetch("/api/users/approval-notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId: user.id }),
          });
        } catch (notifyErr) {
          console.error("Failed to send approval email:", notifyErr);
        }
      }
      setEdits((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      setSavedId(user.id);
      setTimeout(() => setSavedId(null), 2000);
      refresh();
      if (user.id === appUser?.id) {
        await refreshProfile();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    }
  };

  const handleRemoveAccess = async (user: AppUser) => {
    if (!appUser || !firebaseUser) return;
    const block = canRemoveUserAccess(user, appUser.id);
    if (block) {
      setError(block);
      return;
    }
    const name = user.displayName || user.email;
    if (
      !confirm(
        `Remove access for ${name}?\n\nThey will lose login access and be removed from all project teams and shared scripts. Signed agreements and their work files stay on record. You can restore them later.`
      )
    ) {
      return;
    }
    setArchivingId(user.id);
    setError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/admin/users/${user.id}/remove-access`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Remove access failed");
      setEdits((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove access failed");
    } finally {
      setArchivingId(null);
    }
  };

  const handleRestorePartner = async (user: AppUser) => {
    if (!appUser || !firebaseUser) return;
    const block = canRestorePartnerUser(user, appUser.id);
    if (block) {
      setError(block);
      return;
    }
    setArchivingId(user.id);
    setError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/admin/users/${user.id}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");
      setUserListFilter("pending");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setArchivingId(null);
    }
  };

  const isDirty = (user: AppUser) => {
    const edit = getEdit(user);
    const saved = resolvePermissions(user);
    return (
      edit.displayName !== (user.displayName ?? "") ||
      edit.company !== (user.company ?? "") ||
      !permissionsEqual(edit.permissions, saved)
    );
  };

  if (!appUser || !canAccessAdmin) {
    return <LoadingSpinner className="py-20" />;
  }

  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle={
          isOrgAdmin
            ? "Workers, partners, org permissions, and project access"
            : "Project and production access for your team"
        }
      />

      {isOrgAdmin && (
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-md shadow-slate-200/40 ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-slate-900">{stats.total}</p>
              <p className="text-xs font-medium text-slate-500">Total users</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 to-white p-4 ring-1 ring-sky-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-slate-900">{stats.img}</p>
              <p className="text-xs font-medium text-sky-800/80">Insight Media Group</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-white p-4 ring-1 ring-blue-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-slate-900">{stats.partners}</p>
              <p className="text-xs font-medium text-blue-800/80">Partners</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-4 ring-1 ring-amber-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-slate-900">{stats.pending}</p>
              <p className="text-xs font-medium text-amber-800/80">Pending approval</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {isOrgAdmin && stats.pending > 0 && (
        <div className="mb-6">
        <InfoCallout variant="blue">
          {stats.pending} user{stats.pending === 1 ? "" : "s"} waiting for approval. Assign company
          and permissions below, then save to grant access.
        </InfoCallout>
        </div>
      )}

      {canManageProjectTeams && <AdminWorkspacePanel users={users.filter((u) => !isUserArchived(u))} />}

      {isOrgAdmin && <AiUsagePanel />}
      {isOrgAdmin && <SearchModePanel />}
      {isOrgAdmin && <ReferenceGuideAdminPanel />}

      <PageSection
        className="mb-6"
        icon={Shield}
        accent="sky"
        title="Team & access"
        description={
          isOrgAdmin
            ? "Approve users and set org-wide permissions (quotes, clients, production tools). Then assign per-project access for scripts, pre-production, and call sheet shots."
            : "Assign teammates and partners to projects — scripts, pre-production, and call sheet shots."
        }
      >
        {isOrgAdmin && (
          <>
            <p className="mb-4 text-sm font-medium text-slate-800">Organization access</p>
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {loading ? (
              <LoadingSpinner className="py-12" />
            ) : users.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-slate-500">No users found.</p>
                </CardBody>
              </Card>
            ) : filteredUsers.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-slate-500">
                    No {userListFilter} users. Try another filter.
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "active" as const, label: `Active (${users.filter((u) => isUserApproved(u)).length})` },
                      { id: "pending" as const, label: `Pending (${stats.pending})` },
                      { id: "archived" as const, label: `Archived (${stats.archived})` },
                    ] as const
                  ).map((tab) => (
                    <Button
                      key={tab.id}
                      type="button"
                      size="sm"
                      variant={userListFilter === tab.id ? "primary" : "outline"}
                      onClick={() => setUserListFilter(tab.id)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
                {sortedUsers.map((user) => {
            const edit = getEdit(user);
            const dirty = isDirty(user);
            const isCurrentUser = user.id === appUser.id;
            const archived = isUserArchived(user);
            const pending = isUserPendingApproval(user);
            const summary = archived
              ? "Archived"
              : pending
                ? "Pending approval"
                : userSummaryLabel(edit.permissions, edit.company);
            const activePresetId = matchingPresetId(edit.permissions, edit.company);
            const showArchive =
              isOrgAdmin && !archived && canRemoveUserAccess(user, appUser.id) === null;
            const showRestore = isOrgAdmin && archived && canRestorePartnerUser(user, appUser.id) === null;
            const applicableDefs = PERMISSION_DEFINITIONS.filter(
              (d) => !d.insightOnly || edit.company === INSIGHT_MEDIA_GROUP_LLC
            );
            const expanded = expandedIds.has(user.id) || dirty;

            return (
              <Card
                key={user.id}
                className={cn(
                  "overflow-hidden ring-1 transition-shadow",
                  isCurrentUser ? "ring-sky-200 shadow-lg shadow-sky-500/10" : "ring-slate-100"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(user.id)}
                  aria-expanded={expanded}
                  className="w-full border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-6 py-4 text-left transition-colors hover:from-slate-100/90"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-bold text-white shadow-md">
                        {userInitials(user, edit.displayName)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {edit.displayName || user.email}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs font-normal text-sky-600">(you)</span>
                          )}
                        </p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dirty && (
                        <span className="text-xs font-medium text-amber-700">Unsaved changes</span>
                      )}
                      <Badge variant={badgeVariant(summary)}>{summary}</Badge>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-slate-400 transition-transform",
                          expanded && "rotate-180"
                        )}
                      />
                    </div>
                  </div>
                </button>

                {expanded && (
                <CardBody className="space-y-5">
                  {archived && (
                    <InfoCallout variant="blue">
                      <strong>Access removed.</strong> Login is disabled and project access was
                      removed. Their agreements and files remain on record. Restore to re-onboard, then
                      assign permissions and save.
                      {user.archivedAt && (
                        <span className="mt-1 block text-xs opacity-80">
                          Removed {new Date(user.archivedAt).toLocaleString()}
                        </span>
                      )}
                    </InfoCallout>
                  )}

                  {!archived && (
                  <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Display name"
                      value={edit.displayName}
                      onChange={(e) => setEdit(user.id, { displayName: e.target.value })}
                      touch
                    />
                    <Select
                      label="Organization"
                      value={edit.company}
                      onChange={(e) => setEdit(user.id, { company: e.target.value })}
                      options={companyOptions}
                      touch
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Quick presets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PERMISSION_PRESETS.map((preset) => {
                        const isActive = activePresetId === preset.id;
                        return (
                          <Button
                            key={preset.id}
                            type="button"
                            size="sm"
                            variant={isActive ? "primary" : "outline"}
                            aria-pressed={isActive}
                            className={cn(
                              isActive && "ring-2 ring-sky-300 ring-offset-1",
                              preset.id === "none" &&
                                isActive &&
                                "from-slate-600 to-slate-700 shadow-slate-500/20 hover:from-slate-700 hover:to-slate-800"
                            )}
                            onClick={() => applyPreset(user.id, preset.permissions)}
                          >
                            {isActive ? <Check className="mr-1.5 h-3.5 w-3.5" /> : null}
                            {preset.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {PERMISSION_GROUPS.map((group) => {
                    const defs = applicableDefs.filter((d) => d.group === group.id);
                    if (defs.length === 0) return null;
                    return (
                      <div key={group.id} className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-800">{group.label}</h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {defs.map((def) => {
                            const checked = edit.permissions[def.key];
                            return (
                              <label
                                key={def.key}
                                className={cn(
                                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all",
                                  checked
                                    ? "border-sky-300 bg-sky-50/80 ring-1 ring-sky-200"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                  checked={checked}
                                  onChange={() => togglePermission(user.id, def.key)}
                                />
                                <span>
                                  <span className="block text-sm font-medium text-slate-900">
                                    {def.label}
                                  </span>
                                  <span className="block text-xs text-slate-500">
                                    {def.description}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-end border-t border-slate-100 pt-4">
                    <Button size="touch" onClick={() => handleSave(user)} disabled={!dirty || saving}>
                      {savedId === user.id ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Saved
                        </>
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  </div>
                  </>
                  )}

                  {(showArchive || showRestore) && (
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                      {showArchive && (
                        <Button
                          type="button"
                          size="touch"
                          variant="outline"
                          className="border-red-200 text-red-800 hover:bg-red-50"
                          disabled={archivingId === user.id || saving}
                          onClick={() => void handleRemoveAccess(user)}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          {archivingId === user.id ? "Removing…" : "Remove access"}
                        </Button>
                      )}
                      {showRestore && (
                        <Button
                          type="button"
                          size="touch"
                          variant="outline"
                          disabled={archivingId === user.id}
                          onClick={() => void handleRestorePartner(user)}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {archivingId === user.id ? "Restoring…" : "Restore access"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardBody>
                )}
              </Card>
            );
          })}
              </div>
            )}
          </>
        )}

        {canManageProjectTeams && (
          <div className={isOrgAdmin ? "mt-10 border-t border-slate-200 pt-10" : ""}>
            <ProjectAccessHub initialProjectId={initialProjectId} onAdminPage={isOrgAdmin} />
          </div>
        )}
      </PageSection>
    </div>
  );
}
