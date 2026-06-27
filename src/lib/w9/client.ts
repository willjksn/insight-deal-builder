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

export function readPdfFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type !== "application/pdf") {
      reject(new Error("Please choose a PDF file"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("PDF must be 10 MB or smaller"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadStaffW9(
  agreementId: string,
  pdfDataUrl: string,
  fileName: string
): Promise<Agreement> {
  const data = await authFetch(`/api/agreements/${agreementId}/w9`, {
    method: "POST",
    body: JSON.stringify({ pdfDataUrl, fileName }),
  });
  return data.agreement as Agreement;
}

export async function fetchAgreementW9(agreementId: string): Promise<{
  url: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
}> {
  return authFetch(`/api/agreements/${agreementId}/w9`);
}

export async function uploadSigningW9(
  token: string,
  pdfDataUrl: string,
  fileName: string
): Promise<Agreement> {
  const res = await fetch(`/api/sign/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "w9", pdfDataUrl, fileName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to upload W-9");
  return data.agreement as Agreement;
}
