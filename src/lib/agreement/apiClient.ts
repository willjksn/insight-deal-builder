import { auth } from "@/lib/firebase/config";
import { MarketPricingResearch } from "@/lib/agreement/pricingResearchTypes";
import { QuoteScopeSuggestion } from "@/lib/agreement/scopeSuggestTypes";
import { AgreementType } from "@/lib/types";

async function authHeaders(): Promise<HeadersInit> {
  if (!auth?.currentUser) throw new Error("Not signed in");
  const idToken = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" };
}

export async function suggestAgreementScope(
  jobDescription: string,
  agreementType?: AgreementType
): Promise<QuoteScopeSuggestion> {
  const res = await fetch("/api/agreements/suggest-scope", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ jobDescription, agreementType }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Scope suggestion failed");
  return body.suggestion as QuoteScopeSuggestion;
}

export async function researchAgreementPricing(input: {
  jobDescription: string;
  city?: string;
  zip?: string;
  state?: string;
  agreementType?: AgreementType;
  yourQuotedFee?: number;
}): Promise<MarketPricingResearch> {
  const res = await fetch("/api/agreements/pricing-research", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Pricing research failed");
  return body.research as MarketPricingResearch;
}
