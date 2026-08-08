import { describe, expect, it } from "vitest";
import type { AgentDriveEntry } from "@/lib/aiEditor/agentProtocol";
import type { MediaAsset, StorageLocation } from "@/lib/aiEditor/types";
import {
  findRemountCandidates,
  planMediaRemount,
  rewritePathOnNewDrive,
  rewriteProjectRootOnDrive,
} from "@/lib/aiEditor/remountPaths";

function drive(
  letter: string,
  serial: string,
  extras?: Partial<AgentDriveEntry>
): AgentDriveEntry {
  return {
    path: `${letter}:\\`,
    label: `${letter}:`,
    kind: "drive",
    volumeIdentifier: serial,
    storageType: "externalSSD",
    ...extras,
  };
}

function media(partial: Partial<MediaAsset> & { id: string }): MediaAsset {
  return {
    projectId: "p1",
    userId: "u1",
    filename: "clip.mp4",
    originalFilename: "clip.mp4",
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

describe("rewritePathOnNewDrive", () => {
  it("swaps drive letter keeping folder suffix", () => {
    expect(rewritePathOnNewDrive("E:\\Shoots\\Show", "E:\\", "F:\\")).toBe(
      "F:\\Shoots\\Show"
    );
  });

  it("returns null when path is not on old drive", () => {
    expect(rewritePathOnNewDrive("D:\\Other", "E:\\", "F:\\")).toBeNull();
  });
});

describe("rewriteProjectRootOnDrive", () => {
  it("moves project root to new drive", () => {
    expect(rewriteProjectRootOnDrive("E:\\Shoots\\My_Project", "F:\\")).toBe(
      "F:\\Shoots\\My_Project"
    );
  });
});

describe("findRemountCandidates", () => {
  const storage: StorageLocation[] = [
    {
      id: "s1",
      userId: "u1",
      name: "Edit",
      type: "externalSSD",
      purpose: "active",
      path: "E:\\Shoots\\My_Project",
      volumeIdentifier: "SERIAL-EDIT",
      online: true,
      writable: true,
      createdAt: "",
      updatedAt: "",
    },
  ];

  it("detects edit root when volume remounts under new letter", () => {
    const drives = [drive("F", "SERIAL-EDIT", { volumeLabel: "EditSSD" })];
    const found = findRemountCandidates({
      projectRootPath: "E:\\Shoots\\My_Project",
      projectRootVolumeId: "SERIAL-EDIT",
      storage,
      drives,
    });
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("edit");
    expect(found[0].newPath).toBe("F:\\Shoots\\My_Project");
    expect(found[0].oldPath).toBe("E:\\Shoots\\My_Project");
  });

  it("returns empty when letter is unchanged", () => {
    const drives = [drive("E", "SERIAL-EDIT")];
    expect(
      findRemountCandidates({
        projectRootPath: "E:\\Shoots\\My_Project",
        projectRootVolumeId: "SERIAL-EDIT",
        storage,
        drives,
      })
    ).toHaveLength(0);
  });

  it("returns empty without volume id", () => {
    expect(
      findRemountCandidates({
        projectRootPath: "E:\\Shoots\\My_Project",
        storage: [],
        drives: [drive("F", "SERIAL-EDIT")],
      })
    ).toHaveLength(0);
  });

  it("detects archive remount from storage volume id", () => {
    const drives = [drive("G", "SERIAL-BAK", { storageType: "externalHDD" })];
    const found = findRemountCandidates({
      archiveRootPath: "F:\\Backup",
      storage: [
        {
          id: "a1",
          userId: "u1",
          name: "Backup",
          type: "externalHDD",
          purpose: "archive",
          path: "F:\\Backup",
          volumeIdentifier: "SERIAL-BAK",
          online: true,
          writable: true,
          createdAt: "",
          updatedAt: "",
        },
      ],
      drives,
    });
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("archive");
    expect(found[0].newPath).toBe("G:\\Backup");
  });
});

describe("planMediaRemount", () => {
  it("rewrites via relativeProjectPath", () => {
    const patches = planMediaRemount(
      [
        media({
          id: "m1",
          relativeProjectPath: "01_ORIGINAL_MEDIA/CAMERA_A/clip.mp4",
          currentPath: "E:\\Shoots\\Show\\01_ORIGINAL_MEDIA\\CAMERA_A\\clip.mp4",
        }),
      ],
      "E:\\Shoots\\Show",
      "F:\\Shoots\\Show",
      { volumeIdentifier: "SERIAL-EDIT" }
    );
    expect(patches).toHaveLength(1);
    expect(patches[0].currentPath).toBe(
      "F:\\Shoots\\Show\\01_ORIGINAL_MEDIA\\CAMERA_A\\clip.mp4"
    );
    expect(patches[0].onlineStatus).toBe("online");
    expect(patches[0].volumeIdentifier).toBe("SERIAL-EDIT");
  });

  it("rewrites proxy under old root", () => {
    const patches = planMediaRemount(
      [
        media({
          id: "m2",
          relativeProjectPath: "01_ORIGINAL_MEDIA/a.mp4",
          currentPath: "E:\\Shoots\\Show\\01_ORIGINAL_MEDIA\\a.mp4",
          proxyPath: "E:\\Shoots\\Show\\.shootspine-proxies\\a.mp4",
        }),
      ],
      "E:\\Shoots\\Show",
      "F:\\Shoots\\Show"
    );
    expect(patches[0].proxyPath).toBe("F:\\Shoots\\Show\\.shootspine-proxies\\a.mp4");
  });

  it("rewrites archive paths only in archive mode", () => {
    const patches = planMediaRemount(
      [
        media({
          id: "m3",
          currentPath: "E:\\Shoots\\Show\\01_ORIGINAL_MEDIA\\a.mp4",
          archivePath: "F:\\Backup\\Show\\01_ORIGINAL_MEDIA\\a.mp4",
        }),
      ],
      "F:\\Backup",
      "G:\\Backup",
      { mode: "archive" }
    );
    expect(patches).toHaveLength(1);
    expect(patches[0].archivePath).toBe("G:\\Backup\\Show\\01_ORIGINAL_MEDIA\\a.mp4");
    expect(patches[0].currentPath).toBeUndefined();
  });
});
