"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConditionalCollection } from "@/hooks/useConditionalCollection";
import { Project } from "@/lib/types";
import { canManageProjects } from "@/lib/utils/permissions";

/** Projects the user can open — all org projects for admins, or shared memberships for collaborators. */
export function useAccessibleProjects() {
  const { user, appUser } = useAuth();
  const isAdmin = canManageProjects(appUser);
  const orgProjects = useConditionalCollection<Project>("projects", isAdmin);
  const [shared, setShared] = useState<Project[]>([]);
  const [loadingShared, setLoadingShared] = useState(!isAdmin);

  const refreshShared = useCallback(async () => {
    if (!user || isAdmin) return;
    setLoadingShared(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/projects/access", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setShared(data.projects as Project[]);
    } finally {
      setLoadingShared(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    void refreshShared();
  }, [refreshShared]);

  if (isAdmin) {
    return {
      projects: orgProjects.data,
      loading: orgProjects.loading,
      refresh: orgProjects.refresh,
    };
  }

  return {
    projects: shared,
    loading: loadingShared,
    refresh: refreshShared,
  };
}
