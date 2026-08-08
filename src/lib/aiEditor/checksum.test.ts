import { describe, expect, it } from "vitest";
import {
  evaluateDiskSpace,
  formatBytes,
  originalMediaRelativePath,
  sanitizeCameraLabel,
  sha256Hex,
} from "@/lib/aiEditor/checksum";

describe("aiEditor checksum / ingest helpers", () => {
  it("hashes bytes with sha256", async () => {
    const hex = await sha256Hex(new TextEncoder().encode("shootspine"));
    expect(hex).toHaveLength(64);
    expect(hex).toMatch(/^[a-f0-9]+$/);
  });

  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(5 * 1024 * 1024)).toMatch(/MB/);
  });

  it("evaluates disk space with reserve", () => {
    const ok = evaluateDiskSpace(100, 10 * 1024 * 1024 * 1024);
    expect(ok.ok).toBe(true);
    const bad = evaluateDiskSpace(8 * 1024 * 1024 * 1024, 1 * 1024 * 1024 * 1024);
    expect(bad.ok).toBe(false);
  });

  it("builds portable original media paths", () => {
    expect(sanitizeCameraLabel("Camera A")).toBe("CAMERA_A");
    expect(originalMediaRelativePath("Camera B", "A001.MXF")).toBe(
      "01_ORIGINAL_MEDIA/CAMERA_B/A001.MXF"
    );
  });
});
