import { describe, expect, it } from "vitest";
import { EMPTY_PERMISSIONS } from "@/lib/constants/permissions";
import { AppUser } from "@/lib/types";
import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";
import {
  canArchivePartnerUser,
  canRemoveUserAccess,
  canRestorePartnerUser,
} from "@/lib/users/archivePartner";

function partner(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "p1",
    email: "partner@example.com",
    company: "Acme Production",
    permissions: { ...EMPTY_PERMISSIONS, createQuotes: true },
    approved: true,
    ...overrides,
  };
}

describe("canArchivePartnerUser", () => {
  it("allows archiving external partners", () => {
    expect(canArchivePartnerUser(partner(), "admin1")).toBeNull();
  });

  it("blocks IMG staff and self", () => {
    expect(canArchivePartnerUser(partner({ id: "admin1" }), "admin1")).toBeTruthy();
    expect(
      canArchivePartnerUser(partner({ company: INSIGHT_MEDIA_GROUP_LLC }), "admin1")
    ).toBeTruthy();
  });
});

describe("canRemoveUserAccess", () => {
  it("allows removing any non-admin account, including IMG staff", () => {
    expect(canRemoveUserAccess(partner(), "admin1")).toBeNull();
    expect(
      canRemoveUserAccess(partner({ company: INSIGHT_MEDIA_GROUP_LLC }), "admin1")
    ).toBeNull();
  });

  it("blocks self, already-archived, and user-management admins", () => {
    expect(canRemoveUserAccess(partner({ id: "admin1" }), "admin1")).toBeTruthy();
    expect(
      canRemoveUserAccess(partner({ archivedAt: "2026-01-01T00:00:00.000Z" }), "admin1")
    ).toBeTruthy();
    expect(
      canRemoveUserAccess(
        partner({ permissions: { ...EMPTY_PERMISSIONS, manageUsers: true } }),
        "admin1"
      )
    ).toBeTruthy();
  });
});

describe("canRestorePartnerUser", () => {
  it("allows restore only for archived users", () => {
    expect(
      canRestorePartnerUser(
        partner({ archivedAt: "2026-01-01T00:00:00.000Z", approved: false }),
        "admin1"
      )
    ).toBeNull();
    expect(canRestorePartnerUser(partner(), "admin1")).toBeTruthy();
  });
});
