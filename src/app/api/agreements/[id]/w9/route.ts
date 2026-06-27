import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/notifications/server";
import { applyStaffW9Upload, getAgreementW9Url } from "@/lib/signing/server";
import { agreementSupportsW9Upload } from "@/lib/w9/payeeTax";
import { hasPermission, isInsightOrgUser, resolvePermissions } from "@/lib/utils/permissions";
import { AppUser, Agreement } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

async function loadAppUser(uid: string): Promise<AppUser> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) throw new Error("User not found");
  return { id: userSnap.id, ...userSnap.data() } as AppUser;
}

function assertCanManageW9(appUser: AppUser): void {
  resolvePermissions(appUser);
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (!hasPermission(appUser, "editQuotes") && !hasPermission(appUser, "signQuotes")) {
    throw new Error("Not authorized to manage W-9 documents");
  }
}

async function loadAgreement(agreementId: string): Promise<Agreement> {
  const db = getAdminDb()!;
  const snap = await db.collection("agreements").doc(agreementId).get();
  if (!snap.exists) throw new Error("Agreement not found");
  return { id: snap.id, ...snap.data() } as Agreement;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const uid = await verifyAuthToken(_request.headers.get("authorization"));
    const appUser = await loadAppUser(uid);
    assertCanManageW9(appUser);

    const { id: agreementId } = await context.params;
    const agreement = await loadAgreement(agreementId);
    if (!agreementSupportsW9Upload(agreement.agreementType)) {
      return NextResponse.json({ error: "W-9 is not used on this agreement type" }, { status: 400 });
    }

    const w9 = await getAgreementW9Url(agreementId);
    if (!w9) return NextResponse.json({ error: "No W-9 on file" }, { status: 404 });
    return NextResponse.json(w9);
  } catch (err) {
    console.error("w9 GET error:", err);
    const message = err instanceof Error ? err.message : "Failed to load W-9";
    const status =
      message.includes("token") || message.includes("authorization") || message.includes("Not authorized")
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const uid = await verifyAuthToken(request.headers.get("authorization"));
    const appUser = await loadAppUser(uid);
    assertCanManageW9(appUser);

    const { id: agreementId } = await context.params;
    const body = await request.json();
    const pdfDataUrl = typeof body.pdfDataUrl === "string" ? body.pdfDataUrl : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "w9.pdf";

    if (!pdfDataUrl) {
      return NextResponse.json({ error: "pdfDataUrl is required" }, { status: 400 });
    }

    const agreement = await loadAgreement(agreementId);
    if (!agreementSupportsW9Upload(agreement.agreementType)) {
      return NextResponse.json({ error: "W-9 is not used on this agreement type" }, { status: 400 });
    }

    const updated = await applyStaffW9Upload(agreementId, pdfDataUrl, fileName, uid);
    return NextResponse.json({ agreement: updated });
  } catch (err) {
    console.error("w9 POST error:", err);
    const message = err instanceof Error ? err.message : "Failed to upload W-9";
    const status =
      message.includes("token") || message.includes("authorization") || message.includes("Not authorized")
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
