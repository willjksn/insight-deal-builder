import { NextRequest, NextResponse } from "next/server";
import {
  getCreatorAgreementForPortal,
  signCreatorNetworkAgreement,
} from "@/lib/creators/networkAgreementServer";
import { creatorApiError, requireCreatorPortalAccess } from "@/lib/creators/routeHelpers";

export const runtime = "nodejs";

function clientMeta(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;
  return { ipAddress, userAgent };
}

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorPortalAccess(request);
    const agreement = await getCreatorAgreementForPortal(appUser);
    return NextResponse.json(agreement);
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorPortalAccess(request);
    const body = (await request.json()) as {
      typedSignature?: string;
      accepted?: boolean;
    };
    const meta = clientMeta(request);
    const result = await signCreatorNetworkAgreement(appUser, {
      typedSignature: body.typedSignature ?? "",
      accepted: Boolean(body.accepted),
      ...meta,
    });
    return NextResponse.json({
      creator: result.creator,
      record: result.agreement,
      needsSignature: false,
    });
  } catch (err) {
    return creatorApiError(err);
  }
}
