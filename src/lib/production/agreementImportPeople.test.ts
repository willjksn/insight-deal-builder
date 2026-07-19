import { describe, expect, it } from "vitest";
import {
  importPeopleFromAgreement,
  peopleFromAgreement,
} from "@/lib/production/agreementImportPeople";
import type { Agreement } from "@/lib/types";
import type { ProductionPerson } from "@/lib/production/types";

function baseAgreement(partial: Partial<Agreement>): Agreement {
  return {
    id: "a1",
    title: "Test",
    agreementType: "client_project",
    status: "draft",
    parties: [],
    roles: [],
    projectDetails: {
      projectName: "Job",
      projectType: "commercial",
      shootType: "single_day",
      projectOverview: "",
    },
    ...partial,
  } as Agreement;
}

describe("peopleFromAgreement", () => {
  it("maps talent individual and skips Insight/client companies", () => {
    const people = peopleFromAgreement(
      baseAgreement({
        agreementType: "talent_agreement",
        talentAgreementDetails: {
          talentRole: "On-camera host",
          feeAmount: 500,
          feeType: "flat",
        },
        parties: [
          {
            id: "1",
            type: "company",
            name: "Insight Media Group LLC",
            signerName: "Will",
            roleInAgreement: "Production Company",
            signatureRequired: true,
          },
          {
            id: "2",
            type: "individual",
            name: "Alex Talent",
            signerName: "Alex Talent",
            email: "alex@example.com",
            roleInAgreement: "Talent",
            signatureRequired: true,
          },
          {
            id: "3",
            type: "client",
            name: "Acme Co",
            signerName: "Pat",
            roleInAgreement: "Client",
            signatureRequired: true,
          },
        ],
      })
    );
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe("Alex Talent");
    expect(people[0].group).toBe("cast");
    expect(people[0].role).toBe("On-camera host");
    expect(people[0].email).toBe("alex@example.com");
  });

  it("maps roles to camera department", () => {
    const people = peopleFromAgreement(
      baseAgreement({
        roles: [
          {
            id: "r1",
            personOrCompanyName: "Dana Lens",
            role: "DP",
            responsibilities: [],
            paymentType: "day",
            signatureRequired: false,
            initialsRequired: false,
          },
        ],
      })
    );
    expect(people[0].group).toBe("camera_department");
  });
});

describe("importPeopleFromAgreement", () => {
  it("does not duplicate existing name+role", () => {
    const existing: ProductionPerson[] = [
      {
        id: "p1",
        group: "cast",
        name: "Alex Talent",
        role: "Talent",
        sortOrder: 0,
      },
    ];
    const next = importPeopleFromAgreement(
      existing,
      baseAgreement({
        parties: [
          {
            id: "2",
            type: "individual",
            name: "Alex Talent",
            signerName: "Alex Talent",
            roleInAgreement: "Talent",
            signatureRequired: true,
          },
          {
            id: "3",
            type: "individual",
            name: "Sam AD",
            signerName: "Sam AD",
            roleInAgreement: "1st AD",
            signatureRequired: false,
          },
        ],
      })
    );
    expect(next).toHaveLength(2);
    expect(next.some((p) => p.name === "Sam AD")).toBe(true);
  });
});
