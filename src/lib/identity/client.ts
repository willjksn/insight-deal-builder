import { auth } from "@/lib/firebase/config";
import { Agreement } from "@/lib/types";

async function authFetch(url: string, init?: RequestInit) {
  if (!auth?.currentUser) throw new Error("You must be signed in");
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function uploadStaffIdentityCapture(
  agreementId: string,
  partyId: string,
  idFrontDataUrl: string,
  idBackDataUrl: string,
  consentGiven: boolean
): Promise<Agreement> {
  const data = await authFetch(`/api/agreements/${agreementId}/identity`, {
    method: "POST",
    body: JSON.stringify({ partyId, idFrontDataUrl, idBackDataUrl, consentGiven }),
  });
  return data.agreement as Agreement;
}

export async function fetchPartyIdentityImages(
  agreementId: string,
  partyId: string
): Promise<{ frontUrl: string; backUrl: string; capturedAt: string; capturedBy: string }> {
  return authFetch(`/api/agreements/${agreementId}/identity/${partyId}`);
}
