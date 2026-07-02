export async function fetchStripeConfig(): Promise<{ enabled: boolean; publishableKey: string | null }> {
  const res = await fetch("/api/stripe/config", { cache: "no-store" });
  if (!res.ok) return { enabled: false, publishableKey: null };
  return res.json();
}

export async function createAgreementCheckout(
  getToken: () => Promise<string | null>,
  agreementId: string,
  installmentId: string
): Promise<{ url: string }> {
  const token = await getToken();
  if (!token) throw new Error("Not signed in");

  const res = await fetch(`/api/agreements/${agreementId}/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ installmentId }),
  });

  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to start checkout");
  if (!data.url) throw new Error("Stripe checkout URL missing");
  return { url: data.url };
}

export async function createClientCheckout(
  signingToken: string,
  installmentId: string
): Promise<{ url: string }> {
  const res = await fetch("/api/pay/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signingToken, installmentId }),
  });

  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to start checkout");
  if (!data.url) throw new Error("Stripe checkout URL missing");
  return { url: data.url };
}
