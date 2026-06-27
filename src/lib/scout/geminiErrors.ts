/** Turn raw Gemini HTTP errors into actionable messages (esp. production 403). */
export function throwGeminiApiError(status: number, errText: string): never {
  let detail = errText.slice(0, 400);
  try {
    const parsed = JSON.parse(errText) as { error?: { message?: string } };
    if (parsed.error?.message) detail = parsed.error.message;
  } catch {
    /* use raw slice */
  }

  if (status === 403) {
    const projectHint = process.env.FIREBASE_ADMIN_PROJECT_ID
      ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ?? "your Firebase/GCP project";
    throw new Error(
      `Gemini API key blocked (${projectHint}). The app will auto-retry via Vertex AI if FIREBASE_SERVICE_ACCOUNT_JSON is set. ` +
        `Otherwise: enable Generative Language API, use a server-side key (no HTTP-referrer restriction), or set SCOUT_GEMINI_USE_VERTEX=true. ` +
        `Console: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=${projectHint} — ${detail}`
    );
  }

  if (status === 429) {
    throw new Error(`Gemini rate limit exceeded. Wait a moment and retry. ${detail}`);
  }

  if (status === 400 && detail.toLowerCase().includes("api key")) {
    throw new Error(`Invalid Gemini API key. Create a new key at https://aistudio.google.com/apikey — ${detail}`);
  }

  throw new Error(`Gemini API error: ${status} ${detail}`);
}
