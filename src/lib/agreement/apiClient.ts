import { auth } from "@/lib/firebase/config";
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
