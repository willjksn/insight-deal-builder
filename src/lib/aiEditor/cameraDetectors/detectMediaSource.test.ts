import { describe, expect, it } from "vitest";
import { detectMediaSource } from "@/lib/aiEditor/cameraDetectors/detectMediaSource";
import type { MediaSourceProbe } from "@/lib/aiEditor/cameraDetectors/types";

function probe(partial: Partial<MediaSourceProbe>): MediaSourceProbe {
  return {
    mountPath: "E:\\",
    topLevelDirs: [],
    mediaRoot: "E:\\",
    files: [],
    removable: true,
    storageType: "removable",
    ...partial,
  };
}

describe("detectMediaSource", () => {
  it("detects Sony M4ROOT camera cards", () => {
    const d = detectMediaSource(
      probe({
        topLevelDirs: ["PRIVATE", "AVCHD"],
        mediaRoot: "E:\\PRIVATE\\M4ROOT",
        volumeLabel: "FX3",
        files: [
          {
            path: "E:\\PRIVATE\\M4ROOT\\CLIP\\A001C001.MXF",
            filename: "A001C001.MXF",
            sizeBytes: 1_000_000_000,
          },
          {
            path: "E:\\PRIVATE\\M4ROOT\\CLIP\\A001C002.MXF",
            filename: "A001C002.MXF",
            sizeBytes: 900_000_000,
          },
        ],
      })
    );
    expect(d?.sourceType).toBe("cameraCard");
    expect(d?.manufacturer).toBe("Sony");
    expect(d?.probableCameraModel).toMatch(/FX3/i);
    expect(d?.clipCount).toBe(2);
    expect(d!.confidence).toBeGreaterThan(0.5);
  });

  it("detects Zoom-style audio folders", () => {
    const d = detectMediaSource(
      probe({
        topLevelDirs: ["FOLDER01", "FOLDER02"],
        volumeLabel: "F8NPRO",
        files: [
          { path: "E:\\FOLDER01\\ZOOM0001.WAV", filename: "ZOOM0001.WAV", sizeBytes: 50_000_000 },
          { path: "E:\\FOLDER01\\ZOOM0002.WAV", filename: "ZOOM0002.WAV", sizeBytes: 50_000_000 },
        ],
      })
    );
    expect(d?.sourceType).toBe("audioRecorderCard");
    expect(d?.suggestedCameraAssignment).toBe("AUDIO");
  });

  it("ignores empty internal volumes", () => {
    const d = detectMediaSource(
      probe({
        mountPath: "C:\\",
        removable: false,
        storageType: "internal",
        topLevelDirs: ["Windows", "Users"],
        files: [],
      })
    );
    expect(d).toBeNull();
  });
});
