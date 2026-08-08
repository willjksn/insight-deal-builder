import { describe, expect, it } from "vitest";
import {
  joinProjectRelative,
  toRelativeProjectPath,
} from "@/lib/aiEditor/mediaPathResolver";

describe("aiEditor mediaPathResolver", () => {
  it("joins Windows project roots", () => {
    expect(
      joinProjectRelative(
        "X:\\ShootSpine_Projects\\Horror",
        "01_ORIGINAL_MEDIA/CAMERA_A/A001.MXF"
      )
    ).toBe("X:\\ShootSpine_Projects\\Horror\\01_ORIGINAL_MEDIA\\CAMERA_A\\A001.MXF");
  });

  it("derives relative paths portably", () => {
    expect(
      toRelativeProjectPath(
        "X:\\ShootSpine_Projects\\Horror",
        "X:\\ShootSpine_Projects\\Horror\\01_ORIGINAL_MEDIA\\CAMERA_A\\A001.MXF"
      )
    ).toBe("01_ORIGINAL_MEDIA/CAMERA_A/A001.MXF");
  });
});
