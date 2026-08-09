import { describe, expect, it } from "vitest";
import {
  importResultMessage,
  summarizeResolveProbeFailure,
  summarizeResolveWorkflow,
} from "@/lib/aiEditor/resolveWorkflow";

describe("resolveWorkflow", () => {
  it("ready when scripting reachable and project open", () => {
    const s = summarizeResolveWorkflow({
      installed: true,
      scriptingModules: true,
      scriptingReachable: true,
      projectOpen: true,
      running: true,
      pythonAvailable: true,
    });
    expect(s.level).toBe("ready");
    expect(s.canAutoImport).toBe(true);
  });

  it("almost when Resolve running but no project", () => {
    const s = summarizeResolveWorkflow({
      installed: true,
      scriptingModules: true,
      scriptingReachable: true,
      projectOpen: false,
      running: true,
      pythonAvailable: true,
    });
    expect(s.level).toBe("almost");
    expect(s.title).toMatch(/project/i);
  });

  it("almost when Resolve running but External scripting is off", () => {
    const s = summarizeResolveWorkflow({
      installed: true,
      scriptingModules: true,
      scriptingReachable: false,
      projectOpen: false,
      running: true,
      pythonAvailable: true,
      note: "NO_RESOLVE",
    });
    expect(s.level).toBe("almost");
    expect(s.title).toMatch(/auto-import|reach/i);
    expect(s.detail).toMatch(/Free|Studio|Local/i);
    expect(s.canAutoImport).toBe(false);
  });

  it("missing when Resolve not installed", () => {
    expect(summarizeResolveWorkflow({ installed: false }).level).toBe("missing");
  });

  it("probe failure does not claim Resolve is missing", () => {
    const s = summarizeResolveProbeFailure("fetch failed");
    expect(s.level).toBe("manual");
    expect(s.title).not.toMatch(/isn.?t on this computer/i);
    expect(s.canAutoImport).toBe(false);
  });

  it("maps import failure to plain language", () => {
    const m = importResultMessage({ imported: false, reason: "NO_PROJECT" });
    expect(m.title).toMatch(/project/i);
  });

  it("mentions media bin when clips were linked", () => {
    const m = importResultMessage({
      imported: true,
      mediaImported: 4,
      mediaRequested: 4,
      binName: "ShootSpine",
      markersApplied: 3,
    });
    expect(m.detail).toMatch(/4 clips/i);
    expect(m.detail).toMatch(/ShootSpine/);
    expect(m.detail).toMatch(/3 markers/i);
    expect(m.detail.toLowerCase()).toMatch(/bake/);
  });
});
