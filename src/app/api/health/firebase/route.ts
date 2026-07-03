import { NextRequest } from "next/server";
import { getAdminApp } from "@/lib/firebase/admin";
import { apiErrorStatus, requireAdminOrHealthSecret } from "@/lib/api/routeAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrHealthSecret(request);

    const app = getAdminApp();
    return Response.json({
      ok: Boolean(app),
      adminConfigured: Boolean(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_ADMIN_PROJECT_ID
      ),
      pushVapidConfigured: Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firebase Admin failed to load";
    return Response.json({ ok: false, error: message }, { status: apiErrorStatus(message) });
  }
}
