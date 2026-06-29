import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, requireAuthUser } from "@/lib/api/routeAuth";
import { loadAiUsageMonthly } from "@/lib/ai/usageLog";
import { canManageUsers } from "@/lib/utils/permissions";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireAuthUser(request);
    if (!canManageUsers(appUser)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const month = request.nextUrl.searchParams.get("month") ?? undefined;
    const summary = await loadAiUsageMonthly(month ?? undefined);

    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load AI usage";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
