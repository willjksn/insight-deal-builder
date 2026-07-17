import { describe, expect, it } from "vitest";
import {
  buildClientProjectParties,
  clientPartyFromRecord,
} from "@/lib/revenueOpportunities/proposals/buildAgreementParties";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { Client } from "@/lib/types";

const opportunity = {
  subject: { name: "Summit Auto Gallery" },
  contact: { name: "Jordan Lee", email: "jordan@summitauto.com", title: "Owner" },
} as RevenueOpportunity;

const client = {
  id: "client-1",
  businessName: "Summit Auto Gallery",
  contactName: "Jordan Lee",
  email: "jordan@summitauto.com",
  authorizedSignerName: "Jordan Lee",
  authorizedSignerTitle: "Owner",
} as Client;

const imgCompany = {
  displayName: "Insight Media Group LLC",
  legalName: "Insight Media Group LLC",
  authorizedSignerName: "Chris Producer",
  authorizedSignerTitle: "Managing Member",
  email: "hello@insightmediagroup.com",
};

describe("buildClientProjectParties", () => {
  it("adds IMG production company and client signer", () => {
    const parties = buildClientProjectParties(client, opportunity, [imgCompany]);
    expect(parties).toHaveLength(2);
    expect(parties[0].roleInAgreement).toBe("Production Company");
    expect(parties[0].signerName).toBe("Chris Producer");
    expect(parties[1].roleInAgreement).toBe("Client");
    expect(parties[1].email).toBe("jordan@summitauto.com");
  });

  it("builds client party from client record", () => {
    const party = clientPartyFromRecord(client);
    expect(party.name).toBe("Summit Auto Gallery");
    expect(party.signerName).toBe("Jordan Lee");
  });
});
