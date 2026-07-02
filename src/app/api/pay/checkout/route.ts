import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSigningSession } from "@/lib/signing/server";
import { createAgreementCheckoutSession } from "@/lib/stripe/checkout";
import { assertStripeConfigured } from "@/lib/stripe/config";
import { Agreement } from "@/lib/types";

export const runtime = "nodejs";

async function loadFullAgreement(agreementId: string): Promise<Agreement | null> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const snap = await db.collection("agreements").doc(agreementId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Agreement;
}

export async function POST(request: NextRequest) {
  try {
    assertStripeConfigured();
    const body = (await request.json()) as { signingToken?: string; installmentId?: string };
    const signingToken = body.signingToken?.trim();
    const installmentId = body.installmentId?.trim();

    if (!signingToken || !installmentId) {
      return NextResponse.json(
        { error: "signingToken and installmentId are required" },
        { status: 400 }
      );
    }

    const session = await getSigningSession(signingToken);
    if (!session) {
      return NextResponse.json({ error: "Invalid or expired payment link" }, { status: 404 });
    }

    if (session.party.type !== "client") {
      return NextResponse.json(
        { error: "Card payments are only available on client project agreements" },
        { status: 400 }
      );
    }

    const agreement = await loadFullAgreement(session.agreement.id);
    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const { sessionId, url } = await createAgreementCheckoutSession({
      agreement,
      installmentId,
      appUrl,
      customerEmail: session.party.email,
      successPath: `${appUrl.replace(/\/$/, "")}/pay/success?session_id={CHECKOUT_SESSION_ID}&agreementId=${agreement.id}`,
      cancelPath: `${appUrl.replace(/\/$/, "")}/pay/${signingToken}?payment=cancelled`,
    });

    return NextResponse.json({ sessionId, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
