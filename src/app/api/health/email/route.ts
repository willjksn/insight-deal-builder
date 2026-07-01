import { NextRequest } from "next/server";
import { APP_NOTIFICATION_FROM } from "@/lib/brand";
import {
  apiErrorStatus,
  isResendConfigured,
  requireAdminOrHealthSecret,
} from "@/lib/api/routeAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrHealthSecret(request);

    const configured = isResendConfigured();
    return Response.json({
      ok: configured,
      resendConfigured: configured,
      fromEmail: APP_NOTIFICATION_FROM,
      hint: configured
        ? undefined
        : "Set RESEND_API_KEY in production to send agreement and signup emails",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email health check failed";
    return Response.json({ ok: false, error: message }, { status: apiErrorStatus(message) });
  }
}
