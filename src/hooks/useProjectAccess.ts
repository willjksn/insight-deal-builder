"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProjectTeam } from "@/lib/projectAccess/apiClient";
import { ProjectAccessPermissions } from "@/lib/projectAccess/types";
import { canManageProjects, canManageUsers } from "@/lib/utils/permissions";
import { FULL_PROJECT_ACCESS } from "@/lib/projectAccess/types";

export function useProjectAccess(projectId: string | undefined, ownerUserId?: string) {
  const { user, appUser } = useAuth();
  const [permissions, setPermissions] = useState<ProjectAccessPermissions>({
    scripts: false,
    scout: false,
    production: false,
    shots: false,
  });
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || !projectId) {
      setPermissions({ scripts: false, scout: false, production: false, shots: false });
      setCanManageTeam(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (canManageProjects(appUser) || canManageUsers(appUser)) {
        setPermissions({ ...FULL_PROJECT_ACCESS });
        setCanManageTeam(true);
        return;
      }
      if (ownerUserId && ownerUserId === user.uid) {
        setPermissions({ ...FULL_PROJECT_ACCESS });
        setCanManageTeam(true);
        return;
      }
      const data = await fetchProjectTeam(() => user.getIdToken(), projectId);
      setPermissions(data.permissions);
      setCanManageTeam(data.canManageTeam);
    } catch {
      setPermissions({ scripts: false, scout: false, production: false, shots: false });
      setCanManageTeam(false);
    } finally {
      setLoading(false);
    }
  }, [user, projectId, appUser, ownerUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isOwner = Boolean(ownerUserId && user?.uid === ownerUserId);
  const hasGlobal = canManageProjects(appUser) || canManageUsers(appUser);

  return {
    permissions,
    canManageTeam,
    loading,
    refresh,
    canAccessScripts: hasGlobal || isOwner || permissions.scripts,
    canAccessScout: hasGlobal || isOwner || permissions.scout,
    canAccessProduction: hasGlobal || isOwner || permissions.production,
    canAccessShots: hasGlobal || isOwner || permissions.shots || permissions.production,
    canAccessAny:
      hasGlobal ||
      isOwner ||
      permissions.scripts ||
      permissions.scout ||
      permissions.production ||
      permissions.shots,
  };
}
