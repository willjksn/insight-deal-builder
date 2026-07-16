import { google } from "googleapis";
import { GMAIL_SCOPES, gmailClientCredentials, gmailRedirectUri } from "@/lib/revenueOpportunities/gmail/config";

export function createOAuth2Client() {
  const { clientId, clientSecret } = gmailClientCredentials();
  return new google.auth.OAuth2(clientId, clientSecret, gmailRedirectUri());
}

export function buildGmailAuthUrl(state: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
  });
}

export async function exchangeGmailCode(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email;
  if (!email) throw new Error("Could not read Gmail account email");

  return {
    email,
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token ?? "",
    expiryDate: tokens.expiry_date ?? undefined,
    scopes: GMAIL_SCOPES,
  };
}

export function gmailClientWithTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiryDate?: number;
}) {
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });
  return google.gmail({ version: "v1", auth: client });
}

export async function refreshGmailTokensIfNeeded(secrets: {
  accessToken: string;
  refreshToken: string;
  expiryDate?: number;
}): Promise<{ accessToken: string; refreshToken: string; expiryDate?: number; refreshed: boolean }> {
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: secrets.accessToken,
    refresh_token: secrets.refreshToken,
    expiry_date: secrets.expiryDate,
  });

  const expiresSoon = secrets.expiryDate ? secrets.expiryDate < Date.now() + 60_000 : false;
  if (!expiresSoon) {
    return { ...secrets, refreshed: false };
  }

  const { credentials } = await client.refreshAccessToken();
  return {
    accessToken: credentials.access_token ?? secrets.accessToken,
    refreshToken: credentials.refresh_token ?? secrets.refreshToken,
    expiryDate: credentials.expiry_date ?? undefined,
    refreshed: true,
  };
}
