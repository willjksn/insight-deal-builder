import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { bindAiUsageCron } from "@/lib/ai/usageContext";
import { refreshAllTrendSnapshots } from "@/lib/search/trendSnapshots";
import { tavilyAvailable } from "@/lib/search/tavilyClient";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const header = request.headers.get("x-cron-secret");
  return header === secret;
}

/** Weekly job: refresh shared trend snapshots for all script content types. */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!tavilyAvailable()) {
    return NextResponse.json({ error: "TAVILY_API_KEY is not configured" }, { status: 503 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }

  try {
    bindAiUsageCron("cron.trends");
    const result = await refreshAllTrendSnapshots(db);
    return NextResponse.json({
      ok: true,
      ...result,
      refreshedCount: result.refreshed.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
