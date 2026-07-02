import { describe, expect, it } from "vitest";
import {
  canAdminOpenPrivateWorkspace,
  isPartnerOrgUserByCompany,
  workspaceOwnerKind,
} from "@/lib/projectAccess/workspaceAccess";
import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";

describe("workspace privacy policy", () => {
  it("allows admin open for IMG internal owners only", () => {
    expect(canAdminOpenPrivateWorkspace(INSIGHT_MEDIA_GROUP_LLC)).toBe(true);
    expect(canAdminOpenPrivateWorkspace("Acme Production Co")).toBe(false);
    expect(canAdminOpenPrivateWorkspace(undefined)).toBe(false);
  });

  it("classifies partner vs IMG owners", () => {
    expect(isPartnerOrgUserByCompany(INSIGHT_MEDIA_GROUP_LLC)).toBe(false);
    expect(isPartnerOrgUserByCompany("Partner LLC")).toBe(true);
    expect(workspaceOwnerKind(INSIGHT_MEDIA_GROUP_LLC)).toBe("img");
    expect(workspaceOwnerKind("Partner LLC")).toBe("partner");
  });
});
