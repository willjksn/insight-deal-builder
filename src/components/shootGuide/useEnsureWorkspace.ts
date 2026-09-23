"use client";

import { useEffect, useRef } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Workspace } from "@/lib/workspace/types";

/** On first load of a Shoot Guide route, remember that workspace. Do not fight the switcher. */
export function useEnsureWorkspace(workspace: Workspace) {
  const { setWorkspace, hydrated } = useWorkspace();
  const applied = useRef(false);

  useEffect(() => {
    if (!hydrated || applied.current) return;
    applied.current = true;
    setWorkspace(workspace);
  }, [hydrated, workspace, setWorkspace]);
}
