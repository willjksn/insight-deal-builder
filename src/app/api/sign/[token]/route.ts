import { NextRequest, NextResponse } from "next/server";
import {
  applySigningInitial,
  applySigningIdentity,
  applySigningSignature,
  applySigningW9,
  getSigningSession,
  serializeAgreement,
} from "@/lib/signing/server";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const session = await getSigningSession(token);

    if (!session) {
      return NextResponse.json({ error: "This signing link is invalid or has expired." }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (err) {
    console.error("sign session GET error:", err);
    return NextResponse.json({ error: "Failed to load signing session" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    if (body.action === "initial") {
      const { clauseId, initialsDataUrl } = body;
      if (!clauseId || !initialsDataUrl) {
        return NextResponse.json({ error: "clauseId and initialsDataUrl are required" }, { status: 400 });
      }
      const agreement = await applySigningInitial(token, clauseId, initialsDataUrl);
      return NextResponse.json({ agreement: serializeAgreement(agreement) });
    }

    if (body.action === "signature") {
      const { signatureDataUrl } = body;
      if (!signatureDataUrl) {
        return NextResponse.json({ error: "signatureDataUrl is required" }, { status: 400 });
      }
      const agreement = await applySigningSignature(token, signatureDataUrl, appUrl);
      return NextResponse.json({ agreement });
    }

    if (body.action === "identity") {
      const { idFrontDataUrl, idBackDataUrl, consentGiven } = body;
      if (!idFrontDataUrl || !idBackDataUrl) {
        return NextResponse.json({ error: "idFrontDataUrl and idBackDataUrl are required" }, { status: 400 });
      }
      const agreement = await applySigningIdentity(
        token,
        idFrontDataUrl,
        idBackDataUrl,
        consentGiven === true
      );
      return NextResponse.json({ agreement });
    }

    if (body.action === "w9") {
      const { pdfDataUrl, fileName } = body;
      if (!pdfDataUrl) {
        return NextResponse.json({ error: "pdfDataUrl is required" }, { status: 400 });
      }
      const agreement = await applySigningW9(
        token,
        pdfDataUrl,
        typeof fileName === "string" ? fileName : "w9.pdf"
      );
      return NextResponse.json({ agreement });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("sign session POST error:", err);
    const message = err instanceof Error ? err.message : "Signing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
