export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    adminConfigured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_ADMIN_PROJECT_ID),
  });
}
