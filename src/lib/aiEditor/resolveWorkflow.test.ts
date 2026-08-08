import { describe, expect, it } from "vitest";
import {
  importResultMessage,
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
      scriptingReachable: true,
      projectOpen: false,
      running: true,
      pythonAvailable: true,
    });
    expect(s.level).toBe("almost");
    expect(s.title).toMatch(/project/i);
  });

  it("missing when Resolve not installed", () => {
    expect(summarizeResolveWorkflow({ installed: false }).level).toBe("missing");
  });

  it("maps import failure to plain language", () => {
    const m = importResultMessage({ imported: false, reason: "NO_PROJECT" });
    expect(m.title).toMatch(/project/i);
  });
});
