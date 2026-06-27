import { auth } from "@/lib/firebase/config";

export async function triggerClientSignedNotifications(
  agreementId: string,
  partyId: string
): Promise<void> {
  if (!auth?.currentUser) return;

  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch("/api/notifications/agreement-signed", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ agreementId, partyId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to send notifications");
  }
}
