import { describe, expect, it } from "vitest";
import {
  companyAccessKey,
  computeAgreementAccessKeys,
  emailAccessKey,
  userCanAccessAgreement,
} from "@/lib/agreement/access";

describe("computeAgreementAccessKeys", () => {
  it("builds email and company keys from parties", () => {
    const keys = computeAgreementAccessKeys([
      { id: "p1", name: "Acme Corp", email: "Client@Example.com", role: "client" },
    ]);
    expect(keys).toContain("email:client@example.com");
    expect(keys).toContain("company:Acme Corp");
  });
});

describe("userCanAccessAgreement", () => {
  const keys = ["email:client@example.com", "company:Acme Corp"];

  it("grants admins access regardless of keys", () => {
    expect(userCanAccessAgreement([], "any@example.com", "Other", true)).toBe(true);
  });

  it("matches email or company for non-admins", () => {
    expect(userCanAccessAgreement(keys, "client@example.com", "Other", false)).toBe(true);
    expect(userCanAccessAgreement(keys, "other@example.com", "Acme Corp", false)).toBe(true);
    expect(userCanAccessAgreement(keys, "other@example.com", "Other", false)).toBe(false);
  });

  it("denies when access keys are missing", () => {
    expect(userCanAccessAgreement(undefined, "client@example.com", "Acme Corp", false)).toBe(
      false
    );
  });
});

describe("access key helpers", () => {
  it("normalizes email casing", () => {
    expect(emailAccessKey(" Client@Example.com ")).toBe("email:client@example.com");
  });

  it("trims company names", () => {
    expect(companyAccessKey(" Acme ")).toBe("company:Acme");
  });
});
