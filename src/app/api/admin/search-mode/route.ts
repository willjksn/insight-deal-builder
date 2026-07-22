import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { canManageUsers } from "@/lib/utils/permissions";
import { loadSearchMode, saveSearchMode } from "@/lib/search/searchMode";
import { tavilyBudgetStatus } from "@/lib/search/tavilyBudget";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    if (!canManageUsers(appUser)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const [settings, budget] = await Promise.all([loadSearchMode(), tavilyBudgetStatus()]);
    return NextResponse.json({ settings, budget });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load search mode";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    if (!canManageUsers(appUser)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      lightweightMode?: unknown;
      autoCreditGuard?: unknown;
    };

    const update: { lightweightMode?: boolean; autoCreditGuard?: boolean } = {};
    if (typeof body.lightweightMode === "boolean") update.lightweightMode = body.lightweightMode;
    if (typeof body.autoCreditGuard === "boolean") update.autoCreditGuard = body.autoCreditGuard;

    const settings = await saveSearchMode(update, uid);
    const budget = await tavilyBudgetStatus();
    return NextResponse.json({ settings, budget });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update search mode";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
