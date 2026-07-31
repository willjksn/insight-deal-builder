import { NextRequest, NextResponse } from "next/server";
import {
  getIdentityVerificationForPortal,
  submitCreatorIdentityVerification,
} from "@/lib/creators/identityVerificationServer";
import { creatorApiError, requireCreatorPortalAccess } from "@/lib/creators/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorPortalAccess(request);
    const data = await getIdentityVerificationForPortal(appUser);
    return NextResponse.json(data);
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorPortalAccess(request);
    const body = (await request.json()) as {
      frontFileDataUrl?: string;
      frontFileName?: string;
      backFileDataUrl?: string;
      backFileName?: string;
    };
    const result = await submitCreatorIdentityVerification(appUser, {
      frontFileDataUrl: body.frontFileDataUrl ?? "",
      frontFileName: body.frontFileName,
      backFileDataUrl: body.backFileDataUrl,
      backFileName: body.backFileName,
    });
    return NextResponse.json({
      creator: result.creator,
      verification: result.verification,
      canUpload: false,
      hasFront: Boolean(result.verification.frontDocumentId),
      hasBack: Boolean(result.verification.backDocumentId),
    });
  } catch (err) {
    return creatorApiError(err);
  }
}
