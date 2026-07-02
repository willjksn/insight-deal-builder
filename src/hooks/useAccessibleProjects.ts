"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Project } from "@/lib/types";

/** Projects the user can open — org-wide for admins, memberships + owned for collaborators. */
export function useAccessibleProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/projects/access", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { projects?: Project[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load projects");
      }
      setProjects(data.projects ?? []);
    } catch (err) {
      setProjects([]);
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, loading, error, refresh };
}
