import { describe, expect, it } from "vitest";
import { applyHelperJob } from "./ingestHelper";
import { assignIngestClips, ingestDestinationFolder, productionProxyPath, suggestShotForClip } from "./ingest";
import type { ProductionDay } from "./types";
import type { ProductionIngestSession } from "./ingestTypes";

function session(): ProductionIngestSession {
  return {
    id: "sess-1",
    projectId: "proj-1",
    sourceKind: "cfexpress",
    cardName: "A001",
    cameraSlot: "A",
    cameraBody: "FX3",
    destinationPath: "01_ORIGINAL_MEDIA/CAMERA_A",
    createdAt: "2026-09-24T00:00:00.000Z",
    copyCapability: "metadata_only",
    clips: [
      {
        id: "clip-1",
        filename: "A001C001.mp4",
        originalFilename: "A001C001.mp4",
        cameraSlot: "A",
        cameraBody: "FX3",
        sourceCard: "A001",
        sourcePath: "PRIVATE/M4ROOT/CLIP/A001C001.mp4",
        sizeBytes: 1000,
        copyStatus: "waiting",
        verificationStatus: "waiting",
        proxyStatus: "none",
        durationSeconds: 4,
      },
    ],
  };
}

describe("production ingest", () => {
  it("places the proxy under 02_PROXIES and keeps the clip id in the name", () => {
    expect(productionProxyPath("D:\\Media\\01_ORIGINAL_MEDIA\\CAMERA_A\\A001C001.MP4", "clip-1")).toBe(
      "D:\\Media\\02_PROXIES\\CAMERA_A\\clip-1_A001C001.mp4"
    );
  });

  it("uses the existing original-media camera folder", () => {
    expect(ingestDestinationFolder("A")).toBe("01_ORIGINAL_MEDIA/CAMERA_A");
    expect(ingestDestinationFolder("B")).toBe("01_ORIGINAL_MEDIA/CAMERA_B");
  });

  it("suggests a shot only when one duration matches", () => {
    const one = suggestShotForClip({ durationSeconds: 4.2 }, [
      { id: "s1", duration: "4s" },
      { id: "s2", duration: "10s" },
    ]);
    expect(one?.shotId).toBe("s1");
    expect(suggestShotForClip({ durationSeconds: 4 }, [
      { id: "s1", duration: "4s" },
      { id: "s2", duration: "4s" },
    ])).toBeNull();
    expect(suggestShotForClip({ durationSeconds: undefined }, [{ id: "s1", duration: "4s" }])).toBeNull();
  });

  it("assigns a clip into captured footage and can leave it unassigned", () => {
    const days: ProductionDay[] = [
      {
        id: "day-1",
        title: "Day 1",
        dayNumber: 1,
        scenes: [],
        schedule: [],
        shots: [{ id: "shot-1", label: "Gaze", done: false, sortOrder: 0, media: [] }],
      },
    ];
    const assigned = assignIngestClips(days, session(), ["clip-1"], "shot-1");
    const take = assigned.days[0].shots[0].media?.[0];
    expect(take?.role).toBe("captured_footage");
    expect(take?.fileName).toBe("A001C001.mp4");
    expect(take?.metadata?.sourceCard).toBe("A001");
    expect(take?.metadata?.ingestSessionId).toBe("sess-1");
    expect(take?.url).toBe("");
    expect(assigned.session.clips[0].linkedShotId).toBe("shot-1");

    const cleared = assignIngestClips(assigned.days, assigned.session, ["clip-1"], null);
    expect(cleared.days[0].shots[0].media ?? []).toHaveLength(0);
    expect(cleared.session.clips[0].linkedShotId).toBeNull();
  });

  it("applies helper verification onto the same clip id", () => {
    const next = applyHelperJob(session(), {
      id: "job-1",
      status: "complete",
      filesCompleted: 1,
      totalFiles: 1,
      bytesCopied: 1000,
      totalBytes: 1000,
      currentFile: null,
      bytesPerSecond: 0,
      files: [
        {
          id: "clip-1",
          filename: "A001C001.mp4",
          sourcePath: "E:\\CARD\\A001C001.mp4",
          destPath: "D:\\PROJECT\\01_ORIGINAL_MEDIA\\CAMERA_A\\A001C001.mp4",
          status: "verified",
          verification: {
            algorithm: "sha256",
            sourceChecksum: "abc",
            destinationChecksum: "abc",
            verifiedAt: "2026-09-24T00:00:00.000Z",
            result: "match",
          },
          metadata: { codec: "h264", durationSeconds: 4, resolution: "1920x1080" },
          proxyStatus: "none",
        },
      ],
    });
    expect(next.copyCapability).toBe("local_helper");
    expect(next.clips[0].id).toBe("clip-1");
    expect(next.clips[0].copyStatus).toBe("verified");
    expect(next.clips[0].localDestinationPath).toContain("01_ORIGINAL_MEDIA");
    expect(next.clips[0].codec).toBe("h264");
    expect(next.clips[0].verification?.result).toBe("match");
  });
});
