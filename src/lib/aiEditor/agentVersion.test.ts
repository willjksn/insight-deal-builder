import { describe, expect, it } from "vitest";
import {
  assessAgentVersion,
  compareSemver,
  isAgentVersionAtLeast,
  MIN_DESKTOP_AGENT_VERSION,
} from "@/lib/aiEditor/agentVersion";

describe("compareSemver", () => {
  it("orders versions", () => {
    expect(compareSemver("0.14.0", "0.15.0")).toBeLessThan(0);
    expect(compareSemver("0.15.0", "0.15.0")).toBe(0);
    expect(compareSemver("0.16.0", "0.15.0")).toBeGreaterThan(0);
  });
});

describe("isAgentVersionAtLeast", () => {
  it("accepts minimum and newer", () => {
    expect(isAgentVersionAtLeast(MIN_DESKTOP_AGENT_VERSION)).toBe(true);
    expect(isAgentVersionAtLeast("0.15.1")).toBe(true);
    expect(isAgentVersionAtLeast("0.14.0")).toBe(false);
    expect(isAgentVersionAtLeast(undefined)).toBe(false);
  });
});

describe("assessAgentVersion", () => {
  it("flags outdated agents", () => {
    const s = assessAgentVersion("0.14.0");
    expect(s.ok).toBe(false);
    if (!s.ok) {
      expect(s.reason).toBe("outdated");
      expect(s.message).toMatch(/0\.15/);
    }
  });

  it("accepts current agent", () => {
    expect(assessAgentVersion("0.15.0").ok).toBe(true);
  });
});
