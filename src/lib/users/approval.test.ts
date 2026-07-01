import { describe, expect, it } from "vitest";
import { isUserApproved, isUserPendingApproval, shouldApproveOnAdminSave } from "@/lib/users/approval";
import { EMPTY_PERMISSIONS } from "@/lib/constants/permissions";
import { AppUser } from "@/lib/types";

function user(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "u1",
    email: "crew@example.com",
    company: "Acme",
    permissions: { ...EMPTY_PERMISSIONS },
    ...overrides,
  };
}

describe("isUserApproved", () => {
  it("treats legacy users without approved field as approved", () => {
    expect(isUserApproved(user())).toBe(true);
  });

  it("blocks users explicitly marked not approved", () => {
    expect(isUserApproved(user({ approved: false }))).toBe(false);
  });

  it("always approves admins", () => {
    expect(
      isUserApproved(
        user({
          approved: false,
          permissions: { ...EMPTY_PERMISSIONS, manageUsers: true },
        })
      )
    ).toBe(true);
  });
});

describe("isUserPendingApproval", () => {
  it("flags unapproved signups", () => {
    expect(isUserPendingApproval(user({ approved: false }))).toBe(true);
    expect(isUserPendingApproval(user())).toBe(false);
  });
});

describe("shouldApproveOnAdminSave", () => {
  it("requires company and at least one permission", () => {
    expect(shouldApproveOnAdminSave("", EMPTY_PERMISSIONS)).toBe(false);
    expect(shouldApproveOnAdminSave("Acme", EMPTY_PERMISSIONS)).toBe(false);
    expect(
      shouldApproveOnAdminSave("Acme", { ...EMPTY_PERMISSIONS, createQuotes: true })
    ).toBe(true);
  });
});
