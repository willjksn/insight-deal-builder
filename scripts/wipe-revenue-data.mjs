/**
 * Delete all Revenue & Opportunities Firestore docs for a tenant.
 *
 * Usage:
 *   node scripts/wipe-revenue-data.mjs              # dry-run counts
 *   node scripts/wipe-revenue-data.mjs --confirm    # delete
 *
 * Keeps revenueGmailConnections (real OAuth).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const COMPANY =
  process.env.REVENUE_CRON_ORGANIZATION_COMPANY || "Insight Media Group LLC";
const CONFIRM = process.argv.includes("--confirm");

const COLLECTIONS = [
  "revenueCampaigns",
  "revenueCampaignRuns",
  "revenueOpportunities",
  "revenueOutreachActivities",
  "revenueEmailThreads",
  "revenueFollowUpTasks",
  "revenueDiscoverySessions",
  "revenueOpportunityProposals",
  "revenueAgentRuns",
  "revenueWorkflowRuns",
  "revenueFeedbackEvents",
  "revenueSuppressionList",
  "revenueDailyBriefs",
  "revenueWeeklyBriefs",
];

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!saJson) {
  console.error("FIREBASE_SERVICE_ACCOUNT_JSON is required in .env.local");
  process.exit(1);
}

const serviceAccount = JSON.parse(saJson);
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = getFirestore();

async function deleteQueryBatch(query) {
  const snap = await query.get();
  if (snap.empty) return 0;
  const batch = db.batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();
  return snap.size;
}

async function wipeCollection(name) {
  let deleted = 0;
  // Firestore batch limit is 500
  while (true) {
    const query = db
      .collection(name)
      .where("organizationCompany", "==", COMPANY)
      .limit(400);
    const n = await deleteQueryBatch(query);
    deleted += n;
    if (n === 0) break;
  }
  return deleted;
}

async function countCollection(name) {
  const snap = await db
    .collection(name)
    .where("organizationCompany", "==", COMPANY)
    .get();
  return snap.size;
}

async function main() {
  console.log(`Tenant: ${COMPANY}`);
  console.log(CONFIRM ? "Mode: DELETE" : "Mode: dry-run (pass --confirm to delete)");
  console.log("");

  const totals = {};
  let grand = 0;
  for (const name of COLLECTIONS) {
    const count = await countCollection(name);
    totals[name] = count;
    grand += count;
    console.log(`  ${name}: ${count}`);
  }
  console.log(`\nTotal documents: ${grand}`);

  if (!CONFIRM) {
    console.log("\nNo changes made. Re-run with --confirm to delete.");
    return;
  }

  if (grand === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  console.log("\nDeleting…");
  let deletedTotal = 0;
  for (const name of COLLECTIONS) {
    if (totals[name] === 0) continue;
    const deleted = await wipeCollection(name);
    deletedTotal += deleted;
    console.log(`  deleted ${name}: ${deleted}`);
  }
  console.log(`\nDone. Deleted ${deletedTotal} documents.`);
  console.log("Kept: revenueGmailConnections");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
