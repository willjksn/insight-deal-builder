import { describe, expect, it } from "vitest";
import { apiErrorStatus, assertApprovedUser } from "@/lib/api/routeAuth";
import { EMPTY_PERMISSIONS } from "@/lib/constants/permissions";
import { AppUser } from "@/lib/types";

describe("apiErrorStatus", () => {
  it("maps auth errors to 401", () => {
    expect(apiErrorStatus("Missing authorization token")).toBe(401);
    expect(apiErrorStatus("Not authorized to access this agreement")).toBe(401);
    expect(apiErrorStatus("User not found")).toBe(401);
  });

  it("maps missing config to 503", () => {
    expect(apiErrorStatus("Firebase Admin is not configured")).toBe(503);
  });

  it("maps not found to 404", () => {
    expect(apiErrorStatus("Agreement not found")).toBe(404);
  });

  it("defaults unknown errors to 500", () => {
    expect(apiErrorStatus("Unexpected failure")).toBe(500);
  });
});

describe("assertApprovedUser", () => {
  const approved: AppUser = {
    id: "u1",
    email: "crew@example.com",
    company: "Acme",
    permissions: { ...EMPTY_PERMISSIONS },
  };

  it("allows approved users", () => {
    expect(() => assertApprovedUser(approved)).not.toThrow();
  });

  it("blocks pending users", () => {
    expect(() => assertApprovedUser({ ...approved, approved: false })).toThrow("Not authorized");
  });
});
