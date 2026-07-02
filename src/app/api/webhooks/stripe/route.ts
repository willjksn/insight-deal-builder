import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { constructStripeEvent, processStripeWebhookEvent } from "@/lib/stripe/webhook";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    }

    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");
    const event = constructStripeEvent(payload, signature);
    const result = await processStripeWebhookEvent(db, event);

    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
