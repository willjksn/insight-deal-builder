import { describe, expect, it } from "vitest";
import {
  canReclaimActiveCopy,
  planArchiveBatch,
  planRestoreBatch,
  SAFE_DELETE_CONFIRM_PHRASE,
  summarizeArchiveState,
} from "@/lib/aiEditor/archive";
import type { MediaAsset } from "@/lib/aiEditor/types";

function asset(partial: Partial<MediaAsset>): MediaAsset {
  return {
    id: "m1",
    projectId: "p",
    userId: "u",
    filename: "take.mp4",
    originalFilename: "take.mp4",
    extension: "mp4",
    mediaType: "video",
    onlineStatus: "online",
    ingestStatus: "verified",
    analysisStatus: "none",
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("archive planning", () => {
  it("plans archive under archiveRoot/projectSlug/relative path", () => {
    const { items, skipped } = planArchiveBatch({
      media: [
        asset({
          currentPath: "C:\\Projects\\Show\\01_ORIGINAL_MEDIA\\CAMERA_A\\take.mp4",
          relativeProjectPath: "01_ORIGINAL_MEDIA/CAMERA_A/take.mp4",
        }),
      ],
      projectRoot: "C:\\Projects\\Show",
      archiveRoot: "E:\\ARCHIVE",
      projectSlug: "Show",
    });
    expect(skipped).toHaveLength(0);
    expect(items).toHaveLength(1);
    expect(items[0].destPath.replace(/\//g, "\\")).toBe(
      "E:\\ARCHIVE\\Show\\01_ORIGINAL_MEDIA\\CAMERA_A\\take.mp4"
    );
  });

  it("skips already archived at same dest", () => {
    const dest = "E:\\ARCHIVE\\Show\\01_ORIGINAL_MEDIA\\CAMERA_A\\take.mp4";
    const { items, skipped } = planArchiveBatch({
      media: [
        asset({
          currentPath: "C:\\Projects\\Show\\01_ORIGINAL_MEDIA\\CAMERA_A\\take.mp4",
          relativeProjectPath: "01_ORIGINAL_MEDIA/CAMERA_A/take.mp4",
          archivePath: dest,
        }),
      ],
      projectRoot: "C:\\Projects\\Show",
      archiveRoot: "E:\\ARCHIVE",
      projectSlug: "Show",
    });
    expect(items).toHaveLength(0);
    expect(skipped[0]?.reason).toMatch(/Already archived/i);
  });

  it("plans restore when active missing", () => {
    const { items } = planRestoreBatch({
      projectRoot: "C:\\Projects\\Show",
      media: [
        asset({
          archivePath: "E:\\ARCHIVE\\Show\\01_ORIGINAL_MEDIA\\CAMERA_A\\take.mp4",
          relativeProjectPath: "01_ORIGINAL_MEDIA/CAMERA_A/take.mp4",
          currentPath: undefined,
        }),
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].destPath.replace(/\//g, "\\")).toContain(
      "01_ORIGINAL_MEDIA\\CAMERA_A\\take.mp4"
    );
  });

  it("refuses reclaim without archive", () => {
    expect(
      canReclaimActiveCopy(
        asset({ currentPath: "C:\\Projects\\Show\\01_ORIGINAL_MEDIA\\CAMERA_A\\take.mp4" }),
        "C:\\Projects\\Show"
      ).ok
    ).toBe(false);
  });

  it("refuses reclaim of camera-card path outside project", () => {
    expect(
      canReclaimActiveCopy(
        asset({
          currentPath: "D:\\DCIM\\take.mp4",
          archivePath: "E:\\ARCHIVE\\Show\\take.mp4",
        }),
        "C:\\Projects\\Show"
      ).ok
    ).toBe(false);
  });

  it("allows reclaim of active project copy when archived elsewhere", () => {
    const r = canReclaimActiveCopy(
      asset({
        currentPath: "C:\\Projects\\Show\\01_ORIGINAL_MEDIA\\CAMERA_A\\take.mp4",
        archivePath: "E:\\ARCHIVE\\Show\\01_ORIGINAL_MEDIA\\CAMERA_A\\take.mp4",
      }),
      "C:\\Projects\\Show"
    );
    expect(r.ok).toBe(true);
  });

  it("refuses deleting when active path is the archive", () => {
    const p = "E:\\ARCHIVE\\Show\\take.mp4";
    expect(canReclaimActiveCopy(asset({ currentPath: p, archivePath: p }), "C:\\Projects\\Show").ok).toBe(
      false
    );
  });

  it("summarizes archive state", () => {
    const s = summarizeArchiveState(
      [
        asset({
          currentPath: "C:\\Projects\\Show\\a.mp4",
          archivePath: "E:\\ARCHIVE\\Show\\a.mp4",
          relativeProjectPath: "01_ORIGINAL_MEDIA/CAMERA_A/a.mp4",
        }),
        asset({ id: "m2", filename: "b.mp4", currentPath: "C:\\Projects\\Show\\b.mp4" }),
      ],
      "C:\\Projects\\Show"
    );
    expect(s.archived).toBe(1);
    expect(s.reclaimable).toBe(1);
    expect(s.withLocalSource).toBe(2);
  });

  it("exports confirm phrase constant", () => {
    expect(SAFE_DELETE_CONFIRM_PHRASE).toBe("DELETE_ACTIVE_COPY");
  });
});
