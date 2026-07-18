import { NextRequest } from "next/server";
import { n8nWebhookSecret } from "@/lib/revenueOpportunities/n8n/config";

/** Verify inbound n8n callback or outbound shared secret. */
export function verifyN8nWebhookSecret(request: NextRequest): boolean {
  const secret = n8nWebhookSecret();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const header =
    request.headers.get("x-revenue-webhook-secret") ?? request.headers.get("x-n8n-webhook-secret");
  return header === secret;
}

export function n8nOutboundHeaders(): Record<string, string> {
  const secret = n8nWebhookSecret();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["X-Revenue-Webhook-Secret"] = secret;
  const apiKey = process.env.N8N_API_KEY?.trim();
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  return headers;
}
