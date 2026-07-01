export const runtime = "nodejs";

/** Public liveness probe — no config details exposed. */
export async function GET() {
  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
  });
}
