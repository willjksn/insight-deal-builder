import { NextRequest } from "next/server";
import { n8nWebhookSecret } from "@/lib/revenueOpportunities/n8n/config";

export type N8nWebhookAuthResult =
  | { ok: true }
  | {
      ok: false;
      reason: "secret_not_configured" | "secret_missing" | "secret_mismatch";
      expectedLength?: number;
      receivedLength?: number;
    };

/** Inspect inbound auth without exposing the secret value. */
export function inspectN8nWebhookSecret(request: NextRequest): N8nWebhookAuthResult {
  const secret = n8nWebhookSecret();
  if (!secret) return { ok: false, reason: "secret_not_configured" };

  const auth = request.headers.get("authorization")?.trim();
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : undefined;
  const header = (
    request.headers.get("x-revenue-webhook-secret") ??
    request.headers.get("x-n8n-webhook-secret") ??
    request.headers.get("x-webhook-secret") ??
    bearer ??
    (auth && !auth.toLowerCase().startsWith("bearer ") ? auth : undefined)
  )?.trim();

  if (!header) return { ok: false, reason: "secret_missing", expectedLength: secret.length };
  if (header === secret) return { ok: true };
  return {
    ok: false,
    reason: "secret_mismatch",
    expectedLength: secret.length,
    receivedLength: header.length,
  };
}

/** Verify inbound n8n callback or outbound shared secret. */
export function verifyN8nWebhookSecret(request: NextRequest): boolean {
  return inspectN8nWebhookSecret(request).ok;
}

export function n8nOutboundHeaders(): Record<string, string> {
  const secret = n8nWebhookSecret();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["X-Revenue-Webhook-Secret"] = secret;
  const apiKey = process.env.N8N_API_KEY?.trim();
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  return headers;
}
