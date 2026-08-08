/**
 * V2/V4 — plain-language Resolve workflow status (official scripting when available).
 */

export type ResolveWorkflowLevel = "ready" | "almost" | "manual" | "missing";

export type ResolveWorkflowStatus = {
  level: ResolveWorkflowLevel;
  title: string;
  detail: string;
  canAutoImport: boolean;
};

export type ResolveScriptingProbe = {
  installed: boolean;
  running: boolean;
  scriptingModules: boolean;
  scriptingReachable: boolean;
  projectOpen: boolean;
  pythonAvailable: boolean;
  note?: string;
};

export function summarizeResolveWorkflow(
  probe: Partial<ResolveScriptingProbe> & { installed?: boolean; scriptingAvailable?: boolean }
): ResolveWorkflowStatus {
  const installed = Boolean(probe.installed);
  const modules = Boolean(probe.scriptingModules ?? probe.scriptingAvailable);
  const reachable = Boolean(probe.scriptingReachable);
  const projectOpen = Boolean(probe.projectOpen);
  const running = Boolean(probe.running);
  const python = probe.pythonAvailable !== false;

  if (!installed) {
    return {
      level: "missing",
      title: "Resolve isn’t on this computer",
      detail: "Choose “On a Mac” below, or install Resolve here to continue.",
      canAutoImport: false,
    };
  }

  if (reachable && projectOpen) {
    return {
      level: "ready",
      title: "Ready to bring your edit in",
      detail: "Resolve is open with a project. We can place your rough cut automatically.",
      canAutoImport: true,
    };
  }

  if (reachable && running && !projectOpen) {
    return {
      level: "almost",
      title: "Open a project in Resolve",
      detail: "Resolve is running — start or open a project, then bring your edit in.",
      canAutoImport: false,
    };
  }

  if (modules && python && !running) {
    return {
      level: "almost",
      title: "Open Resolve first",
      detail:
        "We’ll save your edit and start Resolve. After you open a project, bring the edit in with one click.",
      canAutoImport: false,
    };
  }

  if (modules && !python) {
    return {
      level: "manual",
      title: "We’ll open Resolve for you",
      detail:
        "Auto-import needs Python on this PC. You can still import the timeline by hand in Resolve.",
      canAutoImport: false,
    };
  }

  return {
    level: "manual",
    title: "Save, then import in Resolve",
    detail:
      "We’ll save your edit and open Resolve. Bring in the timeline with File → Import → Timeline.",
    canAutoImport: false,
  };
}

/** Probe threw (agent down / network) — do not claim Resolve is missing. */
export function summarizeResolveProbeFailure(message?: string): ResolveWorkflowStatus {
  const m = (message || "").toLowerCase();
  const connectHint =
    m.includes("connect") ||
    m.includes("agent") ||
    m.includes("fetch") ||
    m.includes("network") ||
    m.includes("econnrefused");
  return {
    level: "manual",
    title: "Couldn’t check Resolve just now",
    detail: connectHint
      ? "Connect this computer (step 1), then check again."
      : "Resolve may still be fine — open it with a project, then check again. If this keeps happening, restart the helper on this computer.",
    canAutoImport: false,
  };
}

export function importResultMessage(result: {
  imported: boolean;
  reason?: string;
  mediaImported?: number;
  mediaRequested?: number;
  binName?: string;
  markersApplied?: number;
}): { title: string; detail: string } {
  const bin = result.binName || "ShootSpine";
  const markers = result.markersApplied ?? 0;
  const markerBit =
    markers > 0
      ? ` ${markers} marker${markers === 1 ? "" : "s"} added (acts/reels + transitions).`
      : "";
  if (result.imported) {
    const linked = result.mediaImported ?? 0;
    const requested = result.mediaRequested ?? 0;
    if (linked > 0) {
      return {
        title: "Your rough cut is in Resolve",
        detail: `${linked} clip${linked === 1 ? "" : "s"} linked in the “${bin}” media bin.${markerBit} Finish color on the Color page — nothing is baked.`,
      };
    }
    if (requested > 0) {
      return {
        title: "Your rough cut is in Resolve",
        detail: `Timeline imported.${markerBit} If clips are offline, relink from your project media folder (bin “${bin}”).`,
      };
    }
    return {
      title: "Your rough cut is in Resolve",
      detail: `${markerBit.trim() || "If clips look missing, point Resolve at your project’s media folder."}${markerBit ? " Finish color in Resolve — nothing is baked." : ""}`,
    };
  }
  const reason = (result.reason || "").toLowerCase();
  if (reason.includes("project")) {
    return {
      title: "Open a project in Resolve first",
      detail: "Then try Bring edit into Resolve again — or import the timeline by hand.",
    };
  }
  if (reason.includes("running") || reason.includes("script") || reason.includes("import_fail")) {
    return {
      title: "Resolve wasn’t ready yet",
      detail:
        "Make sure Resolve is open, a project is loaded, and External scripting is allowed in Preferences.",
    };
  }
  return {
    title: "Couldn’t import automatically",
    detail: "No problem — use File → Import → Timeline in Resolve and pick the file we saved.",
  };
}
