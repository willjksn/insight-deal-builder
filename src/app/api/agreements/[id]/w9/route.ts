import { NextRequest, NextResponse } from "next/server";
import { loadAgreementForUser } from "@/lib/agreement/serverAccess";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { applyStaffW9Upload, getAgreementW9Url } from "@/lib/signing/server";
import { agreementSupportsW9Upload } from "@/lib/w9/payeeTax";
import { hasPermission, isInsightOrgUser, resolvePermissions } from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

function assertCanViewW9(appUser: AppUser): void {
  resolvePermissions(appUser);
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (!hasPermission(appUser, "viewW9Docs") && !hasPermission(appUser, "manageUsers")) {
    throw new Error("Not authorized to view W-9 documents");
  }
}

function assertCanUploadW9(appUser: AppUser): void {
  resolvePermissions(appUser);
  if (!isInsightOrgUser(appUser)) throw new Error("Not authorized");
  if (!hasPermission(appUser, "editQuotes") && !hasPermission(appUser, "signQuotes")) {
    throw new Error("Not authorized to upload W-9 documents");
  }
}

async function loadAgreement(agreementId: string, appUser: AppUser) {
  return loadAgreementForUser(agreementId, appUser);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanViewW9(appUser);

    const { id: agreementId } = await context.params;
    const agreement = await loadAgreement(agreementId, appUser);
    if (!agreementSupportsW9Upload(agreement.agreementType)) {
      return NextResponse.json({ error: "W-9 is not used on this agreement type" }, { status: 400 });
    }

    const w9 = await getAgreementW9Url(agreementId);
    if (!w9) return NextResponse.json({ error: "No W-9 on file" }, { status: 404 });
    return NextResponse.json(w9);
  } catch (err) {
    console.error("w9 GET error:", err);
    const message = err instanceof Error ? err.message : "Failed to load W-9";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUploadW9(appUser);

    const { id: agreementId } = await context.params;
    const body = await request.json();
    const pdfDataUrl = typeof body.pdfDataUrl === "string" ? body.pdfDataUrl : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "w9.pdf";

    if (!pdfDataUrl) {
      return NextResponse.json({ error: "pdfDataUrl is required" }, { status: 400 });
    }

    const agreement = await loadAgreement(agreementId, appUser);
    if (!agreementSupportsW9Upload(agreement.agreementType)) {
      return NextResponse.json({ error: "W-9 is not used on this agreement type" }, { status: 400 });
    }

    const updated = await applyStaffW9Upload(agreementId, pdfDataUrl, fileName, uid);
    return NextResponse.json({ agreement: updated });
  } catch (err) {
    console.error("w9 POST error:", err);
    const message = err instanceof Error ? err.message : "Failed to upload W-9";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
