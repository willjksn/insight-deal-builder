/**
 * Checksum helpers for verified ingest (V1B).
 * Browser/tests use Web Crypto; Desktop Agent uses Node crypto.
 */

export type ChecksumAlgorithm = "sha256";

export function buffersEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Hex SHA-256 of raw bytes (for unit tests / small buffers). */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto subtle not available");
  const digest = await subtle.digest("SHA-256", data.slice().buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = -1;
  do {
    n /= 1024;
    i += 1;
  } while (n >= 1024 && i < units.length - 1);
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export type DiskSpaceCheck = {
  ok: boolean;
  requiredBytes: number;
  availableBytes?: number;
  capacityBytes?: number;
  message: string;
};

export function evaluateDiskSpace(
  requiredBytes: number,
  availableBytes: number | undefined,
  reserveBytes = 2 * 1024 * 1024 * 1024
): DiskSpaceCheck {
  if (availableBytes == null || !Number.isFinite(availableBytes)) {
    return {
      ok: true,
      requiredBytes,
      availableBytes,
      message: "Disk space unknown — proceed with caution.",
    };
  }
  const need = requiredBytes + reserveBytes;
  if (availableBytes < need) {
    return {
      ok: false,
      requiredBytes,
      availableBytes,
      message: `Not enough free space. Need about ${formatBytes(need)} (includes reserve), have ${formatBytes(availableBytes)}.`,
    };
  }
  return {
    ok: true,
    requiredBytes,
    availableBytes,
    message: `Enough space (${formatBytes(availableBytes)} free).`,
  };
}

/** Sanitize camera folder label for managed ingest paths. */
export function sanitizeCameraLabel(label: string): string {
  const cleaned = label.replace(/[^\w\-]+/g, "_").toUpperCase().trim();
  return cleaned || "CAMERA_A";
}

export function originalMediaRelativePath(cameraLabel: string, filename: string): string {
  return `01_ORIGINAL_MEDIA/${sanitizeCameraLabel(cameraLabel)}/${filename.replace(/^[\\/]+/, "")}`;
}
