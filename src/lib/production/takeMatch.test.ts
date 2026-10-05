import { describe, expect, it } from "vitest";
import type { ProductionIngestClip } from "./ingestTypes";
import { createManualGroup, parseTimecodeSeconds, suggestTakeGroups } from "./takeMatch";

function clip(partial: Partial<ProductionIngestClip> & { id: string }): ProductionIngestClip {
  return {
    filename: `${partial.id}.mp4`,
    originalFilename: `${partial.id}.mp4`,
    cameraSlot: "A",
    copyStatus: "verified",
    verificationStatus: "verified",
    proxyStatus: "none",
    ...partial,
  };
}

describe("take matching", () => {
  it("parses drop-frame timecode as frame counts, not text", () => {
    const a = parseTimecodeSeconds("01:00:00;00", 29.97);
    const b = parseTimecodeSeconds("01:00:00:00", 29.97);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a).toBeLessThan(b as number);
  });

  it("groups matching timecode as high confidence", () => {
    const groups = suggestTakeGroups({
      projectId: "p",
      now: "2026-09-24T12:00:00.000Z",
      clips: [
        clip({ id: "a", cameraSlot: "A", frameRate: 24, timecodeStart: "01:00:00:00", durationSeconds: 10 }),
        clip({ id: "b", cameraSlot: "B", frameRate: 24, timecodeStart: "01:00:01:00", durationSeconds: 10 }),
      ],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].confidence).toBe("high");
    expect(groups[0].matchReasons).toContain("Matching timecode range");
    expect(groups[0].state).toBe("suggested");
    expect(groups[0].members.find((member) => member.clipId === "b")?.offsetSeconds).toBeCloseTo(1, 1);
  });

  it("groups scratch audio from waveform scores without timecode", () => {
    const groups = suggestTakeGroups({
      projectId: "p",
      clips: [
        clip({ id: "a", cameraSlot: "A", durationSeconds: 18.3, recordedAt: "2026-09-24T12:00:00.000Z", timeSource: "camera" }),
        clip({ id: "b", cameraSlot: "B", durationSeconds: 18.7, recordedAt: "2026-09-24T12:00:02.000Z", timeSource: "camera" }),
        clip({ id: "c", cameraSlot: "C", durationSeconds: 18.5, recordedAt: "2026-09-24T12:00:01.000Z", timeSource: "camera" }),
      ],
      waveform: [
        { a: "a", b: "b", score: 0.86, offsetSeconds: 1.238 },
        { a: "a", b: "c", score: 0.81, offsetSeconds: 0.4 },
        { a: "b", b: "c", score: 0.8, offsetSeconds: -0.8 },
      ],
    });
    expect(groups[0].confidence).toBe("high");
    expect(groups[0].members).toHaveLength(3);
    expect(groups[0].matchReasons).toContain("Strong audio waveform match");
    expect(groups[0].members.find((member) => member.clipId === "b")?.offsetSeconds).toBeCloseTo(1.238, 2);
  });

  it("includes an external recorder when the waveform matches", () => {
    const groups = suggestTakeGroups({
      projectId: "p",
      clips: [
        clip({ id: "cam", cameraSlot: "A", durationSeconds: 18 }),
        clip({ id: "f8", filename: "take.wav", originalFilename: "take.wav", cameraSlot: "other", cameraBody: "F8n", durationSeconds: 20.1, audioTracks: 2 }),
      ],
      waveform: [{ a: "cam", b: "f8", score: 0.9, offsetSeconds: -0.412 }],
    });
    expect(groups[0].members.map((member) => member.clipId).sort()).toEqual(["cam", "f8"]);
    expect(groups[0].members.find((member) => member.clipId === "f8")?.offsetSeconds).toBeCloseTo(-0.412, 2);
  });

  it("does not join a clip with different audio", () => {
    const groups = suggestTakeGroups({
      projectId: "p",
      clips: [
        clip({ id: "a", cameraSlot: "A", durationSeconds: 10 }),
        clip({ id: "b", cameraSlot: "B", durationSeconds: 10 }),
      ],
      waveform: [{ a: "a", b: "b", score: 0.12, offsetSeconds: 0 }],
    });
    expect(groups).toHaveLength(0);
  });

  it("does not treat similar duration alone as a match", () => {
    const groups = suggestTakeGroups({
      projectId: "p",
      clips: [
        clip({ id: "a", cameraSlot: "A", durationSeconds: 18.3 }),
        clip({ id: "b", cameraSlot: "B", durationSeconds: 18.7 }),
      ],
    });
    expect(groups).toHaveLength(0);
  });

  it("uses close camera recording times as support, not certainty", () => {
    const groups = suggestTakeGroups({
      projectId: "p",
      clips: [
        clip({ id: "a", cameraSlot: "A", durationSeconds: 18.3, recordedAt: "2026-09-24T12:00:00.000Z", timeSource: "camera" }),
        clip({ id: "b", cameraSlot: "B", durationSeconds: 18.7, recordedAt: "2026-09-24T12:00:02.400Z", timeSource: "camera" }),
      ],
    });
    expect(groups[0].confidence).not.toBe("high");
    expect(groups[0].matchReasons.some((reason) => reason.includes("seconds apart"))).toBe(true);
    expect(groups[0].matchReasons).toContain("Similar duration");
  });

  it("leaves clips with no useful signals ungrouped", () => {
    const groups = suggestTakeGroups({
      projectId: "p",
      clips: [clip({ id: "a", cameraSlot: "A" }), clip({ id: "b", cameraSlot: "B" })],
    });
    expect(groups).toHaveLength(0);
  });

  it("creates a manual group and does not rewrite it", () => {
    const manual = createManualGroup("p", ["a", "b"], "2026-09-24T12:00:00.000Z");
    const next = suggestTakeGroups({
      projectId: "p",
      existing: [manual],
      clips: [
        clip({ id: "a", cameraSlot: "A", frameRate: 24, timecodeStart: "01:00:00:00", durationSeconds: 8 }),
        clip({ id: "b", cameraSlot: "B", frameRate: 24, timecodeStart: "01:00:00:00", durationSeconds: 8 }),
        clip({ id: "c", cameraSlot: "C", durationSeconds: 4 }),
      ],
    });
    const kept = next.find((group) => group.id === manual.id);
    expect(kept?.state).toBe("confirmed");
    expect(kept?.members.map((member) => member.clipId).sort()).toEqual(["a", "b"]);
  });
});
