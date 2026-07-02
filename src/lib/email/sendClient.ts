import { auth } from "@/lib/firebase/config";

export type SendToClientResult = {
  sent: boolean;
  to: string;
  signingUrl: string;
  paymentUrl?: string | null;
  expiresAt: string;
  emailPreview: string;
  resendEmailId?: string;
};

export async function sendAgreementToClient(
  agreementId: string,
  email?: string
): Promise<SendToClientResult> {
  if (!auth?.currentUser) throw new Error("You must be signed in");

  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(`/api/agreements/${agreementId}/send-to-client`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(email ? { email } : {}),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send agreement");
  return data as SendToClientResult;
}
