import { describe, expect, it } from "vitest";
import {
  mockShotSegments,
  technicalFromProbe,
} from "@/lib/aiEditor/analysis";

describe("aiEditor analysis", () => {
  it("builds technical analysis from probe", () => {
    const t = technicalFromProbe("m1", {
      codec: "h264",
      resolution: "1920x1080",
      frameRate: 24,
      durationSeconds: 10,
      audioChannels: 2,
      mediaType: "video",
    });
    expect(t.readable).toBe(true);
    expect(t.issues).toHaveLength(0);
    expect(t.confidence).toBeGreaterThan(0.8);
  });

  it("flags missing audio on video", () => {
    const t = technicalFromProbe("m1", {
      codec: "h264",
      mediaType: "video",
      audioChannels: 0,
    });
    expect(t.issues.some((i) => /audio/i.test(i))).toBe(true);
  });

  it("mocks shot segments covering duration", () => {
    const shots = mockShotSegments("m1", 30);
    expect(shots).toHaveLength(3);
    expect(shots[0].startSeconds).toBe(0);
    expect(shots[2].endSeconds).toBe(30);
  });
});
