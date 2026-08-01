import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { runGlobalSearch } from "@/lib/search/globalSearch";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }
    const results = await runGlobalSearch(appUser, q);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
