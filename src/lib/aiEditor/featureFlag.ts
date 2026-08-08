/**
 * AI Editor module visibility.
 * Default on so the ai-editor branch can be exercised; set NEXT_PUBLIC_AI_EDITOR_ENABLED=false to hide.
 */
export function isAiEditorEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_AI_EDITOR_ENABLED;
  if (raw === undefined || raw === "") return true;
  return raw === "1" || raw.toLowerCase() === "true";
}
