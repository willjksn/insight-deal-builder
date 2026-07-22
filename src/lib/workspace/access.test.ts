import { describe, it, expect } from "vitest";
import { AppUser } from "@/lib/types";
import { defaultWorkspaceForUser } from "./access";
import { isWorkspace } from "./types";

const imgAdmin = {
  id: "u1",
  email: "admin@img.com",
  role: "admin",
  company: "Insight Media Group LLC",
} as AppUser;

const partner = {
  id: "u2",
  email: "partner@other.com",
  role: "member",
  company: "Partner Co",
} as AppUser;

describe("defaultWorkspaceForUser", () => {
  it("defaults to business when there is no user", () => {
    expect(defaultWorkspaceForUser(null)).toBe("business");
    expect(defaultWorkspaceForUser(undefined)).toBe("business");
  });

  it("lands production-tool users in Production", () => {
    expect(defaultWorkspaceForUser(imgAdmin)).toBe("production");
  });

  it("lands non-production users (partners) in Business", () => {
    expect(defaultWorkspaceForUser(partner)).toBe("business");
  });
});

describe("isWorkspace", () => {
  it("validates stored preference values", () => {
    expect(isWorkspace("business")).toBe(true);
    expect(isWorkspace("production")).toBe(true);
    expect(isWorkspace("marketing")).toBe(false);
    expect(isWorkspace(null)).toBe(false);
    expect(isWorkspace(undefined)).toBe(false);
  });
});
