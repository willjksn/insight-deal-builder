import { describe, expect, it } from "vitest";
import {
  framesToSeconds,
  framesToTimecode,
  parseTimecodeToFrames,
  secondsToFrames,
} from "@/lib/aiEditor/frames";

describe("aiEditor frames", () => {
  it("converts seconds and frames at 24fps", () => {
    expect(secondsToFrames(1, 24)).toBe(24);
    expect(framesToSeconds(48, 24)).toBe(2);
  });

  it("formats and parses non-drop timecode", () => {
    expect(framesToTimecode(24 * 60 + 12, 24)).toBe("00:01:00:12");
    expect(parseTimecodeToFrames("00:01:00:12", 24)).toBe(24 * 60 + 12);
  });

  it("rejects invalid timecode", () => {
    expect(parseTimecodeToFrames("99:99:99:99", 24)).toBeNull();
    expect(parseTimecodeToFrames("nope", 24)).toBeNull();
  });
});
