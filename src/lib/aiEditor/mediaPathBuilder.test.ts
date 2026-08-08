import { describe, expect, it } from "vitest";
import {
  buildIngestFolderName,
  buildManagedMediaRoot,
  resolveUniqueFolderName,
  sanitizePathSegment,
} from "@/lib/aiEditor/mediaPathBuilder";

describe("mediaPathBuilder", () => {
  it("sanitizes illegal path characters", () => {
    expect(sanitizePathSegment('Stormi: Horror/Short?')).toBe("Stormi_HorrorShort");
  });

  it("builds YYYY-MM-DD ingest folder names", () => {
    expect(
      buildIngestFolderName({
        shootDate: "2026-08-08",
        clientOrProject: "Stormi",
        shootLabel: "HorrorShort",
        cameraLabel: "FX3",
      })
    ).toBe("2026-08-08_Stormi_HorrorShort_FX3");
  });

  it("builds managed media root under a drive", () => {
    expect(buildManagedMediaRoot("H:\\")).toMatch(/Media[\\/]ShootSpine$/i);
    expect(buildManagedMediaRoot("H:")).toMatch(/^H:\\Media\\ShootSpine$/i);
  });

  it("avoids folder collisions with Card02", () => {
    expect(
      resolveUniqueFolderName("2026-08-08_Stormi_HorrorShort_FX3", [
        "2026-08-08_Stormi_HorrorShort_FX3",
      ])
    ).toBe("2026-08-08_Stormi_HorrorShort_FX3_Card02");
  });
});
