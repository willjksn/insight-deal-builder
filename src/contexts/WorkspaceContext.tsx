"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Workspace,
  WORKSPACE_STORAGE_KEY,
  isWorkspace,
} from "@/lib/workspace/types";
import { defaultWorkspaceForUser } from "@/lib/workspace/access";
import {
  getWorkspaceAiContext,
  WorkspaceAiContext,
} from "@/lib/workspace/aiContext";

interface WorkspaceContextValue {
  /** The active workspace (never null — falls back to the role-based default). */
  workspace: Workspace;
  /** Select a workspace and remember it for next time. */
  setWorkspace: (workspace: Workspace) => void;
  /** True once the persisted preference has been read on the client. */
  hydrated: boolean;
  /** Workspace-aware AI assistant context (spec Part 35). */
  aiContext: WorkspaceAiContext;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const [stored, setStored] = useState<Workspace | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Read the persisted preference once on the client.
  useEffect(() => {
    try {
      const value = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (isWorkspace(value)) setStored(value);
    } catch {
      // localStorage unavailable (private mode, SSR) — fall back to the default.
    }
    setHydrated(true);
  }, []);

  const roleDefault = defaultWorkspaceForUser(appUser);
  const workspace: Workspace = stored ?? roleDefault;

  const setWorkspace = useCallback((next: Workspace) => {
    setStored(next);
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, next);
    } catch {
      // Ignore persistence failures; in-memory selection still applies.
    }
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspace,
      setWorkspace,
      hydrated,
      aiContext: getWorkspaceAiContext(workspace),
    }),
    [workspace, setWorkspace, hydrated]
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
