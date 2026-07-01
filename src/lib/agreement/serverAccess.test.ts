import { describe, expect, it } from "vitest";
import { assertCanAccessAgreement } from "@/lib/agreement/serverAccess";
import { EMPTY_PERMISSIONS } from "@/lib/constants/permissions";
import { Agreement, AppUser } from "@/lib/types";

function agreement(overrides: Partial<Agreement> = {}): Agreement {
  return {
    id: "a1",
    title: "Test deal",
    status: "draft",
    accessKeys: ["email:client@example.com"],
    parties: [],
    signatures: [],
    projectDetails: { projectName: "Project" },
    createdBy: "creator",
    ...overrides,
  } as Agreement;
}

function appUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "u1",
    email: "crew@example.com",
    company: "Acme",
    permissions: { ...EMPTY_PERMISSIONS },
    ...overrides,
  };
}

describe("assertCanAccessAgreement", () => {
  it("allows admins", () => {
    expect(() =>
      assertCanAccessAgreement(
        appUser({ permissions: { ...EMPTY_PERMISSIONS, manageUsers: true } }),
        agreement({ accessKeys: [] })
      )
    ).not.toThrow();
  });

  it("allows party email match", () => {
    expect(() =>
      assertCanAccessAgreement(
        appUser({ email: "client@example.com" }),
        agreement()
      )
    ).not.toThrow();
  });

  it("denies unrelated users", () => {
    expect(() =>
      assertCanAccessAgreement(appUser({ email: "other@example.com" }), agreement())
    ).toThrow("Not authorized");
  });
});
