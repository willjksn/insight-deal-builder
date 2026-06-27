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

async function fetchIdentityImageBlob(
  agreementId: string,
  partyId: string,
  side: "front" | "back"
): Promise<Blob> {
  if (!auth?.currentUser) throw new Error("You must be signed in");
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(`/api/agreements/${agreementId}/identity/${partyId}/${side}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to load ID image");
  }
  return res.blob();
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
  const meta = (await authFetch(`/api/agreements/${agreementId}/identity/${partyId}`)) as {
    capturedAt: string;
    capturedBy: string;
  };

  const [frontBlob, backBlob] = await Promise.all([
    fetchIdentityImageBlob(agreementId, partyId, "front"),
    fetchIdentityImageBlob(agreementId, partyId, "back"),
  ]);

  return {
    frontUrl: URL.createObjectURL(frontBlob),
    backUrl: URL.createObjectURL(backBlob),
    capturedAt: meta.capturedAt,
    capturedBy: meta.capturedBy,
  };
}
