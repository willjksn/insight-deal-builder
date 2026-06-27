import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "insight-deal-builder";
const uid = process.argv[2];
const email = process.argv[3];
const displayName = process.argv[4] || "Will Jackson";

if (!uid || !email) {
  console.error("Usage: node scripts/create-admin-user.mjs <uid> <email> [displayName]");
  process.exit(1);
}

const FULL_PERMISSIONS = {
  createQuotes: true,
  editQuotes: true,
  deleteQuotes: true,
  duplicateQuotes: true,
  signQuotes: true,
  downloadPdf: true,
  emailQuotes: true,
  viewAllOrgDeals: true,
  manageClients: true,
  manageCompanies: true,
  manageCrew: true,
  manageProjects: true,
  manageTemplates: true,
  deleteTemplates: true,
  manageUsers: true,
  loadDemoData: true,
};

function boolField(value) {
  return { booleanValue: value };
}

function permissionsMap(permissions) {
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(permissions).map(([key, value]) => [key, boolField(value)])
      ),
    },
  };
}

const configPath = join(homedir(), ".config", "configstore", "firebase-tools.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

async function getAccessToken() {
  const expiresAt = config.tokens?.expires_at ?? 0;
  if (config.tokens?.access_token && Date.now() < expiresAt - 60_000) {
    return config.tokens.access_token;
  }

  const refreshToken = config.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error("No Firebase CLI refresh token found. Run: firebase login");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Failed to refresh access token: ${await tokenRes.text()}`);
  }

  const data = await tokenRes.json();
  return data.access_token;
}

const accessToken = await getAccessToken();

const docUrl =
  `https://firestore.googleapis.com/v1/projects/${projectId}` +
  `/databases/(default)/documents/users/${uid}`;

const body = {
  fields: {
    email: { stringValue: email },
    displayName: { stringValue: displayName },
    role: { stringValue: "admin" },
    company: { stringValue: "Insight Media Group LLC" },
    permissions: permissionsMap(FULL_PERMISSIONS),
    createdAt: { timestampValue: new Date().toISOString() },
    updatedAt: { timestampValue: new Date().toISOString() },
  },
};

const mask = [
  "email",
  "displayName",
  "role",
  "company",
  "permissions",
  "createdAt",
  "updatedAt",
]
  .map((f) => `updateMask.fieldPaths=${f}`)
  .join("&");

const writeRes = await fetch(`${docUrl}?${mask}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

if (!writeRes.ok) {
  console.error("Failed to write user document:", await writeRes.text());
  process.exit(1);
}

console.log(`Created/updated users/${uid} as full admin (${email})`);
