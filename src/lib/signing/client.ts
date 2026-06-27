import { auth } from "@/lib/firebase/config";

export async function createClientSigningLink(
  agreementId: string,
  partyId: string
): Promise<{ url: string; expiresAt: string }> {
  if (!auth?.currentUser) throw new Error("You must be signed in");

  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch("/api/signing-links", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ agreementId, partyId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create signing link");
  return { url: data.url, expiresAt: data.expiresAt };
}
