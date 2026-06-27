import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, assertCanViewIdentity, requireAuthUser } from "@/lib/api/routeAuth";
import { downloadIdentityImage } from "@/lib/identity/storage";
import { getPartyIdentityMetadata } from "@/lib/identity/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; partyId: string; side: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireAuthUser(request);
    assertCanViewIdentity(appUser);

    const { id: agreementId, partyId, side } = await context.params;
    if (side !== "front" && side !== "back") {
      return NextResponse.json({ error: "Invalid side" }, { status: 400 });
    }

    const meta = await getPartyIdentityMetadata(agreementId, partyId);
    const storagePath = side === "front" ? meta?.idFrontStoragePath : meta?.idBackStoragePath;
    if (!storagePath) {
      return NextResponse.json({ error: "ID image not found" }, { status: 404 });
    }

    const { buffer, contentType } = await downloadIdentityImage(storagePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("identity image GET error:", err);
    const message = err instanceof Error ? err.message : "Failed to load ID image";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
