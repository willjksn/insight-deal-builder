import { getAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const app = getAdminApp();
    return Response.json({
      ok: Boolean(app),
      adminConfigured: Boolean(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_ADMIN_PROJECT_ID
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firebase Admin failed to load";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
