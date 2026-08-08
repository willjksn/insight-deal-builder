import { describe, expect, it } from "vitest";
import { planResolveMediaImport } from "@/lib/aiEditor/resolveBin";

describe("resolveBin", () => {
  it("prefers resolvedPath and dedupes", () => {
    const { candidates } = planResolveMediaImport({
      projectRoot: "C:/Projects/Show",
      media: [
        { resolvedPath: "C:/Projects/Show/01_ORIGINAL_MEDIA/a.mp4", relativeProjectPath: "01_ORIGINAL_MEDIA/a.mp4" },
        { resolvedPath: "C:/Projects/Show/01_ORIGINAL_MEDIA/a.mp4" },
        { relativeProjectPath: "01_ORIGINAL_MEDIA/b.mp4" },
      ],
    });
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatch(/a\.mp4$/i);
    expect(candidates[1]).toMatch(/b\.mp4$/i);
  });

  it("joins relative paths when resolvedPath missing", () => {
    const { candidates } = planResolveMediaImport({
      projectRoot: "D:\\Show",
      media: [{ relativeProjectPath: "01_ORIGINAL_MEDIA/CAMERA_A/take.mov" }],
    });
    expect(candidates[0].replace(/\//g, "\\")).toBe(
      "D:\\Show\\01_ORIGINAL_MEDIA\\CAMERA_A\\take.mov"
    );
  });

  it("skips empty mappings", () => {
    expect(planResolveMediaImport({ media: [{}] }).candidates).toEqual([]);
  });
});
