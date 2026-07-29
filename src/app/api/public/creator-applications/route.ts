import { NextRequest, NextResponse } from "next/server";
import { isCreatorError } from "@/lib/creators/errors";
import {
  submitPublicCreatorApplication,
  validatePublicCreatorApplication,
} from "@/lib/creators/publicApply";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const input = validatePublicCreatorApplication(body);
    const result = await submitPublicCreatorApplication(input);
    return NextResponse.json({ application: result }, { status: 201 });
  } catch (err) {
    if (isCreatorError(err)) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Unable to submit application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
