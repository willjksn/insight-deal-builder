import { createHmac, timingSafeEqual } from "crypto";
import { gmailClientCredentials } from "@/lib/revenueOpportunities/gmail/config";

interface GmailOAuthState {
  userId: string;
  organizationCompany: string;
  ts: number;
}

function stateSecret(): string {
  return gmailClientCredentials().clientSecret;
}

export function signGmailOAuthState(input: Omit<GmailOAuthState, "ts">): string {
  const payload: GmailOAuthState = { ...input, ts: Date.now() };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyGmailOAuthState(state: string): GmailOAuthState {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("Invalid OAuth state");
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Invalid OAuth state signature");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as GmailOAuthState;
  if (Date.now() - payload.ts > 15 * 60_000) throw new Error("OAuth state expired");
  return payload;
}
