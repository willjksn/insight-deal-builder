import { describe, expect, it } from "vitest";
import {
  pickBestCameraSource,
  pickBestDestinationDrive,
  planGuidedWorkspace,
} from "@/lib/aiEditor/guidedWorkspace";
import type { DetectedMediaSource } from "@/lib/aiEditor/cameraDetectors/types";

describe("guidedWorkspace", () => {
  it("prefers external SSD over C: for destinations", () => {
    const best = pickBestDestinationDrive([
      {
        rootPath: "C:\\",
        label: "This PC (C:)",
        storageType: "This PC",
        freeBytes: 1e12,
      },
      {
        rootPath: "H:\\",
        label: "T7 Shield (H:) · External SSD",
        storageType: "External SSD",
        freeBytes: 8e11,
      },
    ]);
    expect(best?.rootPath).toBe("H:\\");
  });

  it("picks camera cards over generic external media", () => {
    const sources: DetectedMediaSource[] = [
      {
        id: "generic:H",
        sourceType: "externalHDD",
        mediaMediumLabel: "External",
        mediaRoot: "H:\\",
        mountPath: "H:\\",
        clipCount: 12,
        totalBytes: 1e9,
        confidence: 0.35,
        reasons: [],
        files: [],
      },
      {
        id: "sony:E",
        sourceType: "cameraCard",
        mediaMediumLabel: "Sony",
        probableCameraModel: "FX3",
        mediaRoot: "E:\\M4ROOT",
        mountPath: "E:\\",
        clipCount: 11,
        totalBytes: 7e10,
        confidence: 0.9,
        reasons: [],
        files: [],
      },
    ];
    expect(pickBestCameraSource(sources)?.mountPath).toBe("E:\\");
  });

  it("migrates away from Videos\\ShootSpineSmoke when SSD exists", () => {
    const plan = planGuidedWorkspace({
      projectName: "Monopoly Night",
      currentProjectRoot: "C:\\Users\\Owner\\Videos\\ShootSpineSmoke",
      destinationDrives: [
        {
          rootPath: "C:\\",
          label: "This PC",
          storageType: "This PC",
        },
        {
          rootPath: "H:\\",
          label: "T7 Shield (H:) · External SSD",
          storageType: "External SSD",
          freeBytes: 800 * 1024 ** 3,
        },
      ],
    });
    expect(plan?.shouldMigrate).toBe(true);
    expect(plan?.projectRoot.replace(/\//g, "\\")).toMatch(
      /^H:\\Media\\ShootSpine\\Monopoly_Night$/i
    );
  });

  it("keeps an existing SSD project folder", () => {
    const plan = planGuidedWorkspace({
      projectName: "Monopoly Night",
      currentProjectRoot: "H:\\Media\\ShootSpine\\Monopoly_Night",
      destinationDrives: [
        {
          rootPath: "H:\\",
          label: "T7 Shield (H:) · External SSD",
          storageType: "External SSD",
        },
      ],
    });
    expect(plan?.keepingExisting).toBe(true);
    expect(plan?.shouldMigrate).toBe(false);
    expect(plan?.projectRoot).toContain("Monopoly_Night");
  });
});
