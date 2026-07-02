import { NextResponse } from "next/server";
import { getStripePublishableKey, isStripeConfigured } from "@/lib/stripe/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    enabled: isStripeConfigured(),
    publishableKey: getStripePublishableKey() ?? null,
  });
}
