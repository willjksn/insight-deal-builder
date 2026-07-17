import {
  createInsightMediaGroupParty,
} from "@/lib/agreement/defaults";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { Agreement, AgreementParty, Client, Company } from "@/lib/types";

export function clientPartyFromRecord(client: Client): AgreementParty {
  return {
    id: crypto.randomUUID(),
    type: "client",
    name: client.businessName,
    signerName: client.authorizedSignerName?.trim() || client.contactName?.trim() || "",
    signerTitle: client.authorizedSignerTitle,
    email: client.email,
    roleInAgreement: "Client",
    signatureRequired: true,
    initialsRequired: false,
  };
}

export function clientPartyFromOpportunityContact(opportunity: RevenueOpportunity): AgreementParty | null {
  const email = opportunity.contact?.email?.trim() || opportunity.subject.publicEmail?.trim();
  if (!email) return null;
  return {
    id: crypto.randomUUID(),
    type: "client",
    name: opportunity.subject.name.trim(),
    signerName: opportunity.contact?.name?.trim() || "",
    signerTitle: opportunity.contact?.title?.trim(),
    email,
    roleInAgreement: "Client",
    signatureRequired: true,
    initialsRequired: false,
  };
}

/** Match wizard step 1: IMG production company + client signer. */
export function buildClientProjectParties(
  client: Client | null,
  opportunity: RevenueOpportunity,
  companies: Pick<Company, "displayName" | "legalName" | "authorizedSignerName" | "authorizedSignerTitle" | "email">[]
): AgreementParty[] {
  const img = companies.find(
    (c) => c.displayName === "Insight Media Group LLC" || c.legalName.includes("Insight Media Group")
  );
  const prodParty = createInsightMediaGroupParty(img);
  const clientParty = client ? clientPartyFromRecord(client) : clientPartyFromOpportunityContact(opportunity);
  if (!clientParty) return [prodParty];
  return [prodParty, clientParty];
}

export function agreementClientName(client: Client | null, opportunity: RevenueOpportunity): string {
  return client?.businessName?.trim() || opportunity.subject.name.trim();
}

export function partiesPatchForRevenueAgreement(
  client: Client | null,
  opportunity: RevenueOpportunity,
  companies: Pick<Company, "displayName" | "legalName" | "authorizedSignerName" | "authorizedSignerTitle" | "email">[]
): Pick<Agreement, "parties" | "projectDetails"> {
  const parties = buildClientProjectParties(client, opportunity, companies);
  return {
    parties,
    projectDetails: {
      projectName: "",
      clientName: agreementClientName(client, opportunity),
      projectType: "Business Brand Package",
      shootType: "Photo + Video",
      projectOverview: "",
    },
  };
}
