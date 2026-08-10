/**
 * Guided ingest — pick SSD + project folder + camera card with minimal user decisions.
 */

import type { DetectedMediaSource } from "@/lib/aiEditor/cameraDetectors/types";
import type { AgentDriveEntry } from "@/lib/aiEditor/agentProtocol";
import { buildGuidedProjectRoot } from "@/lib/aiEditor/mediaPathBuilder";
import {
  type IngestDestinationDriveOption,
  inferStorageTypeForPath,
} from "@/lib/aiEditor/storageDrives";
import { formatBytes } from "@/lib/aiEditor/checksum";

export type GuidedWorkspacePlan = {
  /** Absolute project root ShootSpine should use */
  projectRoot: string;
  driveRoot: string;
  driveLabel: string;
  storageType: string;
  freeBytes?: number;
  /** True when current workspace is on C: (or missing) and a better SSD exists */
  shouldMigrate: boolean;
  /** Keeping an existing non-C project root */
  keepingExisting: boolean;
  summary: string;
};

export type GuidedCameraPlan = {
  source: DetectedMediaSource;
  title: string;
  detail: string;
};

function normalizeDriveRoot(path: string): string | null {
  const m = path.trim().match(/^([A-Za-z]:)/);
  return m ? `${m[1].toUpperCase()}\\` : null;
}

function isInternalSystemRoot(path: string): boolean {
  const n = path.replace(/\//g, "\\").toLowerCase();
  return (
    /^c:\\users\\/i.test(n) ||
    /^c:\\$/i.test(n) ||
    n.includes("\\videos\\shootspinesmoke")
  );
}

/** Prefer external SSD, then other non-card drives, then C: as last resort. */
export function pickBestDestinationDrive(
  destinations: IngestDestinationDriveOption[]
): IngestDestinationDriveOption | null {
  if (!destinations.length) return null;
  const score = (d: IngestDestinationDriveOption) => {
    const t = (d.storageType || "").toLowerCase();
    const letter = d.rootPath.replace(/\\/g, "").toUpperCase();
    if (t.includes("external ssd")) return 0;
    if (letter !== "C:" && t.includes("drive") && !t.includes("this pc")) return 1;
    if (t.includes("external hdd")) return 2;
    if (letter === "C:" || t.includes("this pc")) return 9;
    return 5;
  };
  return destinations.slice().sort((a, b) => score(a) - score(b) || a.rootPath.localeCompare(b.rootPath))[0];
}

/** Best camera / audio card for guided copy (not a random SSD with leftover MP4s). */
export function pickBestCameraSource(
  sources: DetectedMediaSource[]
): DetectedMediaSource | null {
  if (!sources.length) return null;
  const cards = sources.filter(
    (s) => s.sourceType === "cameraCard" || s.sourceType === "audioRecorderCard"
  );
  const pool = cards.length ? cards : sources;
  return pool.slice().sort((a, b) => b.confidence - a.confidence || b.clipCount - a.clipCount)[0] || null;
}

export function planGuidedWorkspace(input: {
  projectName: string;
  destinationDrives: IngestDestinationDriveOption[];
  knownDrives?: AgentDriveEntry[];
  currentProjectRoot?: string | null;
}): GuidedWorkspacePlan | null {
  const best = pickBestDestinationDrive(input.destinationDrives);
  if (!best) return null;

  const projectName = (input.projectName || "Untitled footage edit").trim();
  const recommendedRoot = buildGuidedProjectRoot(best.rootPath, projectName);
  const current = input.currentProjectRoot?.trim() || "";
  const currentDrive = current ? normalizeDriveRoot(current) : null;
  const bestDrive = normalizeDriveRoot(best.rootPath);

  let projectRoot = recommendedRoot;
  let keepingExisting = false;
  let shouldMigrate = false;

  if (current) {
    const onInternal = isInternalSystemRoot(current);
    const currentType = input.knownDrives
      ? inferStorageTypeForPath(current, input.knownDrives)
      : "unknown";
    const betterSsd =
      best.storageType.toLowerCase().includes("external ssd") &&
      bestDrive &&
      currentDrive &&
      bestDrive !== currentDrive;

    if (onInternal && betterSsd) {
      shouldMigrate = true;
      projectRoot = recommendedRoot;
    } else if (!onInternal && currentType !== "internal") {
      projectRoot = current;
      keepingExisting = true;
    } else if (!onInternal) {
      projectRoot = current;
      keepingExisting = true;
    } else {
      // Internal / smoke folder with no better drive — keep but note it
      projectRoot = current;
      keepingExisting = true;
    }
  }

  const driveRoot = normalizeDriveRoot(projectRoot) || best.rootPath;
  const driveOpt =
    input.destinationDrives.find(
      (d) => normalizeDriveRoot(d.rootPath) === normalizeDriveRoot(driveRoot)
    ) || best;

  const free =
    driveOpt.freeBytes != null ? ` · ${formatBytes(driveOpt.freeBytes)} free` : "";
  const summary = keepingExisting
    ? shouldMigrate
      ? `Switch to ${driveOpt.label}${free}`
      : `Using your project folder on ${driveOpt.label}${free}`
    : `Will save to ${driveOpt.label}${free}`;

  return {
    projectRoot,
    driveRoot,
    driveLabel: driveOpt.label,
    storageType: driveOpt.storageType,
    freeBytes: driveOpt.freeBytes,
    shouldMigrate,
    keepingExisting,
    summary,
  };
}

export function planGuidedCamera(sources: DetectedMediaSource[]): GuidedCameraPlan | null {
  const source = pickBestCameraSource(sources);
  if (!source) return null;
  const model = source.probableCameraModel || source.label || "Camera";
  const title = `${model} · ${source.clipCount} clip${source.clipCount === 1 ? "" : "s"}`;
  const detail = `${formatBytes(source.totalBytes)} from ${source.mountPath}`;
  return { source, title, detail };
}

/**
 * True when path is a managed project folder — safe to auto-create / rename leaf.
 * Current: Media\{ProjectName}
 * Legacy: Media\ShootSpine\{ProjectName}
 */
export function isManagedShootSpinePath(projectRoot: string): boolean {
  const n = projectRoot.replace(/\//g, "\\").toLowerCase().replace(/[\\]+$/, "");
  if (n.includes("\\media\\shootspine\\") || n.endsWith("\\media\\shootspine")) {
    return true;
  }
  // H:\Media\Monopoly_Night — project leaf directly under Media
  return /\\media\\[^\\]+$/i.test(n) && !n.endsWith("\\media\\shootspine");
}

export function buildGuidedWorkspaceFromDrive(
  driveRoot: string,
  projectName: string
): string {
  return buildGuidedProjectRoot(driveRoot, projectName);
}
