/**
 * V12 — classify and label desktop drives for edit (SSD) vs archive (HDD) setup.
 */

import type { AgentDriveEntry } from "@/lib/aiEditor/agentProtocol";
import type { StorageType } from "@/lib/aiEditor/types";

export function formatBytesShort(bytes?: number | null): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null;
  const gb = bytes / (1024 ** 3);
  if (gb >= 1000) return `${(gb / 1024).toFixed(1)} TB`;
  if (gb >= 10) return `${Math.round(gb)} GB`;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 ** 2);
  return `${Math.max(1, Math.round(mb))} MB`;
}

/** Infer ShootSpine storage type from agent drive metadata. */
export function inferStorageType(drive?: AgentDriveEntry | null): StorageType {
  if (!drive) return "unknown";
  if (drive.storageType) return drive.storageType;
  if (drive.kind === "home" || drive.kind === "desktop" || drive.kind === "documents") {
    return "internal";
  }
  if (drive.kind === "videos") return "internal";
  if (drive.kind !== "drive" && drive.kind !== "volume") return "unknown";

  const bus = (drive.busType || "").toLowerCase();
  const media = (drive.mediaType || "").toLowerCase();
  const driveType = (drive.driveType || "").toLowerCase();
  const letter = drive.path.replace(/\\/g, "").toUpperCase();
  const isUsb =
    bus.includes("usb") ||
    bus.includes("thunderbolt") ||
    driveType.includes("removable") ||
    drive.removable === true;

  if (driveType.includes("network") || bus.includes("file back")) return "network";

  if (isUsb) {
    if (media.includes("ssd")) return "externalSSD";
    if (media.includes("hdd") || media.includes("hard")) return "externalHDD";
    // Large USB disks are usually archive HDDs; small sticks are removable.
    if ((drive.capacityBytes || 0) >= 500 * 1024 ** 3) return "externalHDD";
    return "removable";
  }

  if (letter === "C:" || letter === "C") return "internal";
  if (media.includes("ssd")) return "internal"; // second internal SSD
  if (media.includes("hdd") || media.includes("hard")) return "externalHDD";
  return "unknown";
}

export function storageTypeLabel(type: StorageType): string {
  switch (type) {
    case "externalSSD":
      return "External SSD";
    case "externalHDD":
      return "External HDD";
    case "internal":
      return "This PC";
    case "removable":
      return "Removable";
    case "network":
    case "NAS":
      return "Network";
    default:
      return "Drive";
  }
}

/** Human label for picker chips, e.g. "EditSSD (E:) · External SSD · 420 GB free". */
export function friendlyDriveLabel(drive: AgentDriveEntry): string {
  const type = inferStorageType(drive);
  const typeLabel = storageTypeLabel(type);
  const vol = (drive.volumeLabel || "").trim();
  const letterMatch = drive.path.match(/^([A-Za-z]:)/);
  const letter = letterMatch ? letterMatch[1].toUpperCase() : "";
  const free = formatBytesShort(drive.availableBytes);

  if (drive.kind === "videos") return "Videos";
  if (drive.kind === "desktop") return "Desktop";
  if (drive.kind === "documents") return "Documents";
  if (drive.kind === "home") return "Your user folder";

  const name = vol || (letter ? `Drive ${letter}` : drive.label);
  const withLetter =
    vol && letter && !vol.toUpperCase().includes(letter.replace(":", ""))
      ? `${vol} (${letter})`
      : name.includes(":")
        ? name
        : letter
          ? `${name} (${letter})`
          : name;

  const parts = [withLetter, typeLabel];
  if (free) parts.push(`${free} free`);
  return parts.join(" · ");
}

/** Match a folder path to a drive root entry. */
export function driveForPath(
  path: string,
  drives: AgentDriveEntry[]
): AgentDriveEntry | null {
  const normalized = path.replace(/\//g, "\\").toLowerCase();
  const roots = drives
    .filter((d) => d.kind === "drive" || d.kind === "volume")
    .slice()
    .sort((a, b) => b.path.length - a.path.length);
  for (const d of roots) {
    const root = d.path.replace(/\//g, "\\").toLowerCase();
    const rootWithSlash = root.endsWith("\\") ? root : `${root}\\`;
    if (normalized === root || normalized.startsWith(rootWithSlash)) return d;
  }
  return null;
}

export function inferStorageTypeForPath(
  path: string,
  drives: AgentDriveEntry[]
): StorageType {
  return inferStorageType(driveForPath(path, drives));
}

/** Sort starters: edit prefers SSD; archive prefers HDD. */
export function sortDrivesForPurpose(
  drives: AgentDriveEntry[],
  purpose: "edit" | "archive"
): AgentDriveEntry[] {
  const score = (d: AgentDriveEntry) => {
    const t = inferStorageType(d);
    if (purpose === "edit") {
      if (t === "externalSSD") return 0;
      if (t === "internal" && d.kind === "drive" && !/^c:\\?$/i.test(d.path)) return 1;
      if (t === "internal") return 3;
      if (t === "externalHDD") return 4;
      if (t === "removable") return 5;
      return 6;
    }
    // archive
    if (t === "externalHDD") return 0;
    if (t === "externalSSD") return 2;
    if (t === "removable") return 3;
    if (t === "network" || t === "NAS") return 4;
    if (t === "internal") return 5;
    return 6;
  };
  return drives.slice().sort((a, b) => score(a) - score(b) || a.path.localeCompare(b.path));
}
