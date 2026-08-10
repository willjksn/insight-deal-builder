import { describe, expect, it } from "vitest";
import { defaultOrientationForPlatform } from "@/lib/contentPlan/types";

describe("defaultOrientationForPlatform", () => {
  it("uses 9:16 for vertical social", () => {
    expect(defaultOrientationForPlatform("instagram_reel")).toBe("9:16");
    expect(defaultOrientationForPlatform("tiktok")).toBe("9:16");
    expect(defaultOrientationForPlatform("youtube_short")).toBe("9:16");
    expect(defaultOrientationForPlatform("paid_social")).toBe("9:16");
  });

  it("uses 16:9 for horizontal formats", () => {
    expect(defaultOrientationForPlatform("youtube")).toBe("16:9");
    expect(defaultOrientationForPlatform("website")).toBe("16:9");
    expect(defaultOrientationForPlatform("commercial")).toBe("16:9");
  });
});
